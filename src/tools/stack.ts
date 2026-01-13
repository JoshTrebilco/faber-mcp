import { executeCommand, ProgressCallback } from '../ssh.js';
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
  confirm?: boolean;
}

export interface StackPreview {
  confirmed: false;
  preview: {
    user: string;
    repository: string;
    branch: string;
    domain: string | null;
    php: string;
    dbname: string;
    skipDb: boolean;
    skipDomain: boolean;
    skipEnv: boolean;
    skipDeploy: boolean;
    skipReverb: boolean;
  };
  message: string;
}

export interface StackResult {
  confirmed: true;
  success: boolean;
  output: string;
  stderr: string;
  exitCode: number;
  deviceFlow: { verificationUri: string; userCode: string } | null;
  pending: boolean;
  credentials: Record<string, string>;
}

export async function createStack(config: ServerConfig, params: StackCreateParams, onProgress?: ProgressCallback): Promise<StackPreview | StackResult> {
  // If not confirmed, return a preview of what will be created
  if (!params.confirm) {
    const preview = {
      user: params.user,
      repository: params.repository,
      branch: params.branch || 'main',
      domain: params.domain || null,
      php: params.php || '8.4',
      dbname: params.dbname || params.user,
      skipDb: params.skipDb || false,
      skipDomain: params.skipDomain || false,
      skipEnv: params.skipEnv || false,
      skipDeploy: params.skipDeploy || false,
      skipReverb: params.skipReverb || false,
    };

    const components = [];
    components.push(`• App user: ${preview.user}`);
    components.push(`• Repository: ${preview.repository}`);
    components.push(`• Branch: ${preview.branch}`);
    components.push(`• PHP version: ${preview.php}`);
    
    if (!preview.skipDomain) {
      components.push(`• Domain: ${preview.domain || '(none specified)'}`);
    } else {
      components.push(`• Domain: (skipped)`);
    }
    
    if (!preview.skipDb) {
      components.push(`• Database: ${preview.dbname}`);
    } else {
      components.push(`• Database: (skipped)`);
    }
    
    if (preview.skipEnv) components.push(`• .env configuration: (skipped)`);
    if (preview.skipDeploy) components.push(`• Initial deployment: (skipped)`);
    if (preview.skipReverb) components.push(`• Reverb WebSocket: (skipped)`);

    const message = [
      '═'.repeat(50),
      'Stack Creation Preview',
      '═'.repeat(50),
      '',
      'The following stack will be created:',
      '',
      ...components,
      '',
      '─'.repeat(50),
      'To proceed, call this tool again with the same',
      'parameters and set confirm: true',
      '',
      'To modify, update the parameters (user, domain,',
      'etc.) and call again.',
      '═'.repeat(50),
    ].join('\n');

    return {
      confirmed: false,
      preview,
      message,
    };
  }

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
  // Enable device flow detection to return GitHub auth prompts immediately
  const result = await executeCommand(config, command, {
    timeout: 600000,
    debug: true,
    detectDeviceFlow: true,
    onProgress
  });
  
  // Use device flow from SSH result (detected in real-time) or parse from stderr
  const parsedDeviceFlow = parseDeviceFlow(result.stderr);
  const deviceFlow = result.deviceFlow || 
    (parsedDeviceFlow?.verificationUri && parsedDeviceFlow?.userCode 
      ? { verificationUri: parsedDeviceFlow.verificationUri, userCode: parsedDeviceFlow.userCode } 
      : null);
  
  return {
    confirmed: true,
    success: result.exitCode === 0,
    output: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    deviceFlow,
    pending: result.pending || false,
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
