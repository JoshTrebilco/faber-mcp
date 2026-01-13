import { executeCommand } from '../ssh.js';
import { ServerConfig } from '../config.js';

export async function listReleases(config: ServerConfig, username: string) {
  const result = await executeCommand(config, `faber app releases ${username}`);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed to list releases: ${result.stderr}`);
  }

  return {
    output: result.stdout,
    releases: parseReleases(result.stdout)
  };
}

export async function rollback(config: ServerConfig, username: string, release?: string) {
  const command = release 
    ? `faber app rollback ${username} ${release}`
    : `faber app rollback ${username}`;
    
  const result = await executeCommand(config, command);
  
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    stderr: result.stderr,
    message: result.exitCode === 0 
      ? `✓ Rolled back ${username} successfully`
      : `✗ Rollback failed for ${username}`
  };
}

// Helper: Parse releases output
function parseReleases(output: string): Array<{ release: string; status: string; size: string }> {
  const releases: Array<{ release: string; status: string; size: string }> = [];
  const lines = output.split('\n');
  let inTable = false;
  
  for (const line of lines) {
    if (line.includes('RELEASE') && line.includes('STATUS')) {
      inTable = true;
      continue;
    }
    
    if (inTable && line.includes('───')) {
      continue;
    }
    
    if (inTable && line.trim()) {
      // Remove ANSI color codes
      const cleanLine = line.replace(/\x1B\[[0-9;]*m/g, '');
      const parts = cleanLine.trim().split(/\s{2,}/);
      
      if (parts.length >= 3) {
        releases.push({
          release: parts[0],
          status: parts[1],
          size: parts[2]
        });
      }
    }
  }
  
  return releases;
}
