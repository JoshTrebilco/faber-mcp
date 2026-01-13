import { executeCommand } from '../ssh.js';
import { ServerConfig } from '../config.js';

export async function listDomains(config: ServerConfig) {
  const result = await executeCommand(config, 'faber domain list');
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed to list domains: ${result.stderr}`);
  }

  return {
    output: result.stdout,
    domains: parseDomainList(result.stdout)
  };
}

export async function createDomain(config: ServerConfig, domain: string, app: string) {
  const result = await executeCommand(
    config,
    `faber domain create --domain=${domain} --app=${app}`,
    { timeout: 300000 } // 5 minutes for SSL certificate
  );
  
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    stderr: result.stderr,
    message: result.exitCode === 0 
      ? `✓ Domain ${domain} created and assigned to ${app}`
      : `✗ Failed to create domain`
  };
}

// Helper: Parse domain list output
function parseDomainList(output: string): Array<{ domain: string; app: string; ssl: string }> {
  const domains: Array<{ domain: string; app: string; ssl: string }> = [];
  const lines = output.split('\n');
  let inTable = false;
  
  for (const line of lines) {
    if (line.includes('DOMAIN') && line.includes('APP')) {
      inTable = true;
      continue;
    }
    
    if (inTable && line.includes('───')) {
      continue;
    }
    
    if (inTable && line.trim()) {
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 3) {
        domains.push({
          domain: parts[0],
          app: parts[1],
          ssl: parts[2]
        });
      }
    }
  }
  
  return domains;
}
