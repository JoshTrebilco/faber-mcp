import { executeCommand } from '../ssh.js';
import { ServerConfig } from '../config.js';

export async function listDatabases(config: ServerConfig) {
  const result = await executeCommand(config, 'faber database list');
  
  if (result.exitCode !== 0) {
    throw new Error(`Failed to list databases: ${result.stderr}`);
  }

  return {
    output: result.stdout,
    databases: parseDatabaseList(result.stdout)
  };
}

export async function createDatabase(config: ServerConfig, name?: string) {
  const command = name 
    ? `faber database create --name=${name}`
    : 'faber database create';
    
  const result = await executeCommand(config, command);
  
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    stderr: result.stderr,
    credentials: parseDatabaseCredentials(result.stdout)
  };
}

// Helper: Parse database list output
function parseDatabaseList(output: string): Array<{ database: string; username: string }> {
  const databases: Array<{ database: string; username: string }> = [];
  const lines = output.split('\n');
  let inTable = false;
  
  for (const line of lines) {
    if (line.includes('DATABASE') && line.includes('USERNAME')) {
      inTable = true;
      continue;
    }
    
    if (inTable && line.includes('───')) {
      continue;
    }
    
    if (inTable && line.trim()) {
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 2) {
        databases.push({
          database: parts[0],
          username: parts[1]
        });
      }
    }
  }
  
  return databases;
}

// Helper: Parse database credentials from create output
function parseDatabaseCredentials(output: string): Record<string, string> {
  const credentials: Record<string, string> = {};
  const lines = output.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s+(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      const value = match[2].trim().replace(/\x1B\[[0-9;]*m/g, '');
      credentials[key] = value;
    }
  }
  
  return credentials;
}
