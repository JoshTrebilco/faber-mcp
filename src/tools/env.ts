import { executeCommand } from '../ssh.js';
import { ServerConfig } from '../config.js';

export async function getEnv(config: ServerConfig, username: string) {
  const result = await executeCommand(config, `cat /home/${username}/.env`);
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read .env file: ${result.stderr}`);
  }

  return {
    content: result.stdout,
    variables: parseEnvFile(result.stdout)
  };
}

export async function setEnvVar(config: ServerConfig, username: string, key: string, value: string) {
  // Escape special characters for bash
  const escapedValue = value.replace(/'/g, "'\\''");
  const escapedKey = key.replace(/'/g, "'\\''");
  
  // Use sed to update or append the env variable
  const command = `
    if grep -q "^${escapedKey}=" /home/${username}/.env; then
      sed -i "s|^${escapedKey}=.*|${escapedKey}=${escapedValue}|" /home/${username}/.env
    else
      echo "${escapedKey}=${escapedValue}" >> /home/${username}/.env
    fi
  `.trim();
  
  const result = await executeCommand(config, command);
  
  return {
    success: result.exitCode === 0,
    message: result.exitCode === 0 
      ? `✓ Set ${key}=${value} in .env`
      : `✗ Failed to update .env file`
  };
}

// Helper: Parse .env file into key-value pairs
function parseEnvFile(content: string): Record<string, string> {
  const variables: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) {
      continue;
    }
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      variables[match[1].trim()] = match[2].trim();
    }
  }
  
  return variables;
}
