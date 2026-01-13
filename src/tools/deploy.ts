import { executeCommand } from '../ssh.js';
import { ServerConfig } from '../config.js';

export async function deploy(config: ServerConfig, username: string) {
  // Deploy can take a while, set timeout to 10 minutes
  const result = await executeCommand(config, `faber deploy ${username}`, 600000);
  
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    message: result.exitCode === 0 
      ? `✓ Deployment completed successfully for ${username}`
      : `✗ Deployment failed for ${username} (exit code: ${result.exitCode})`
  };
}
