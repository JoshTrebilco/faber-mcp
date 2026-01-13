import { executeCommand } from '../ssh.js';
import { ServerConfig } from '../config.js';

export async function checkApp(config: ServerConfig, name: string) {
  const result = await executeCommand(config, `faber app show ${name}`);
  
  if (result.exitCode !== 0) {
    return {
      exists: false,
      message: `App '${name}' not found on server`
    };
  }

  return {
    exists: true,
    output: result.stdout,
    details: parseAppShow(result.stdout)
  };
}

export async function listApps(config: ServerConfig) {
  const result = await executeCommand(config, 'faber app list');
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed to list apps: ${result.stderr}`);
  }

  return {
    output: result.stdout,
    apps: parseAppList(result.stdout)
  };
}

export async function getDeployKey(config: ServerConfig, username: string) {
  const result = await executeCommand(config, `cat /home/${username}/gitkey.pub`);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed to retrieve deploy key: ${result.stderr}`);
  }

  return {
    publicKey: result.stdout.trim(),
    instructions: [
      'Add this SSH public key as a deploy key to your Git repository:',
      '',
      'For GitHub:',
      '1. Go to your repository → Settings → Deploy keys',
      '2. Click "Add deploy key"',
      '3. Paste the public key below',
      '4. Optionally check "Allow write access" if needed',
      '5. Click "Add key"'
    ].join('\n')
  };
}

// Helper: Parse app show output
function parseAppShow(output: string): Record<string, string> {
  const details: Record<string, string> = {};
  const lines = output.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s+(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      details[key] = match[2].trim();
    }
  }
  
  return details;
}

// Helper: Parse app list output
function parseAppList(output: string): Array<{ username: string; php: string; domain: string }> {
  const apps: Array<{ username: string; php: string; domain: string }> = [];
  const lines = output.split('\n');
  let inTable = false;
  
  for (const line of lines) {
    if (line.includes('USERNAME') && line.includes('PHP') && line.includes('DOMAIN')) {
      inTable = true;
      continue;
    }
    
    if (inTable && line.includes('───')) {
      continue;
    }
    
    if (inTable && line.trim()) {
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 3) {
        apps.push({
          username: parts[0],
          php: parts[1],
          domain: parts[2]
        });
      }
    }
  }
  
  return apps;
}
