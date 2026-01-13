import { executeCommand } from '../ssh.js';
import { ServerConfig } from '../config.js';

export async function getServerStatus(config: ServerConfig) {
  const result = await executeCommand(config, 'faber status');
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed to get server status: ${result.stderr}`);
  }

  return {
    output: result.stdout,
    status: parseServerStatus(result.stdout)
  };
}

export async function restartService(config: ServerConfig, service: string) {
  const validServices = ['nginx', 'php', 'mysql', 'supervisor', 'redis'];
  
  if (!validServices.includes(service)) {
    throw new Error(`Invalid service. Must be one of: ${validServices.join(', ')}`);
  }

  const result = await executeCommand(config, `faber service restart ${service}`);
  
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    stderr: result.stderr,
    message: result.exitCode === 0 
      ? `✓ Service ${service} restarted successfully`
      : `✗ Failed to restart ${service}`
  };
}

// Helper: Parse server status output
function parseServerStatus(output: string): Record<string, string> {
  const status: Record<string, string> = {};
  const lines = output.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s+(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      const value = match[2].trim().replace(/\x1B\[[0-9;]*m/g, ''); // Remove ANSI codes
      status[key] = value;
    }
  }
  
  return status;
}
