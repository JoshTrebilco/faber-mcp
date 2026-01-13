import { executeCommand } from '../ssh.js';
import { ServerConfig } from '../config.js';

export async function getWebhookLogs(config: ServerConfig, lines: number = 50) {
  const result = await executeCommand(config, `tail -n ${lines} /var/log/faber/webhook.log`);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed to retrieve webhook logs: ${result.stderr}`);
  }

  return {
    output: result.stdout,
    lines: result.stdout.split('\n').filter(l => l.trim())
  };
}

export async function getAppLogs(config: ServerConfig, username: string, lines: number = 50) {
  const result = await executeCommand(
    config,
    `tail -n ${lines} /home/${username}/current/storage/logs/laravel.log`
  );
  
  if (result.exitCode !== 0) {
    // Try alternative log location
    const altResult = await executeCommand(
      config,
      `tail -n ${lines} /home/${username}/logs/laravel.log`
    );
    
    if (altResult.exitCode !== 0) {
      throw new Error(`Failed to retrieve app logs: ${altResult.stderr}`);
    }
    
    return {
      output: altResult.stdout,
      lines: altResult.stdout.split('\n').filter(l => l.trim())
    };
  }

  return {
    output: result.stdout,
    lines: result.stdout.split('\n').filter(l => l.trim())
  };
}
