import { executeCommand } from '../ssh.js';
import { ServerConfig } from '../config.js';

export interface StackCreateParams {
  user: string;
  repository: string;
  branch?: string;
  domain?: string;
  php?: string;
  dbname?: string;
  skipDb?: boolean;
  skipDomain?: boolean;
  skipEnv?: boolean;
  skipDeploy?: boolean;
  skipReverb?: boolean;
}

export async function createStack(config: ServerConfig, params: StackCreateParams) {
  // Build command with parameters
  const args = [];
  
  args.push(`--user=${params.user}`);
  args.push(`--repository=${params.repository}`);
  
  if (params.branch) args.push(`--branch=${params.branch}`);
  if (params.domain) args.push(`--domain=${params.domain}`);
  if (params.php) args.push(`--php=${params.php}`);
  if (params.dbname) args.push(`--dbname=${params.dbname}`);
  
  if (params.skipDb) args.push('--skip-db');
  if (params.skipDomain) args.push('--skip-domain');
  if (params.skipEnv) args.push('--skip-env');
  if (params.skipDeploy) args.push('--skip-deploy');
  if (params.skipReverb) args.push('--skip-reverb');
  
  const command = `faber stack create ${args.join(' ')}`;
  
  // Execute with longer timeout for stack creation (10 minutes)
  const result = await executeCommand(config, command, 600000);
  
  // Parse stderr for GitHub Device Flow information
  const deviceFlow = parseDeviceFlow(result.stderr);
  
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    deviceFlow,
    credentials: parseStackCredentials(result.stdout)
  };
}

// Helper: Parse GitHub Device Flow information from stderr
function parseDeviceFlow(stderr: string): { verificationUri?: string; userCode?: string } | null {
  const lines = stderr.split('\n');
  let verificationUri: string | undefined;
  let userCode: string | undefined;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for "1. Open: https://github.com/login/device"
    const uriMatch = line.match(/Open:\s+(https:\/\/github\.com\/login\/device)/);
    if (uriMatch) {
      verificationUri = uriMatch[1];
    }
    
    // Look for "2. Enter code: A1B2-C3D4"
    const codeMatch = line.match(/Enter code:\s+([A-Z0-9-]+)/);
    if (codeMatch) {
      userCode = codeMatch[1];
    }
  }
  
  if (verificationUri && userCode) {
    return { verificationUri, userCode };
  }
  
  return null;
}

// Helper: Parse stack creation credentials from output
function parseStackCredentials(output: string): Record<string, string> {
  const credentials: Record<string, string> = {};
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Match lines like "Username:   value" or "Password:   value"
    const match = line.match(/^([^:]+):\s+(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      const value = match[2].trim();
      
      // Skip ANSI color codes
      const cleanValue = value.replace(/\x1B\[[0-9;]*m/g, '');
      credentials[key] = cleanValue;
    }
  }
  
  return credentials;
}
