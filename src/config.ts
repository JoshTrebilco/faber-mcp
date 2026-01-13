import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface ServerConfig {
  host: string;
  user: string;
  keyPath: string;
  port?: number;
}

export interface Config {
  defaultServer: string;
  servers: Record<string, ServerConfig>;
}

export function loadConfig(): Config {
  const configPath = join(homedir(), '.faber-mcp.json');
  
  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found at ${configPath}\n\n` +
      'Please create ~/.faber-mcp.json with your server configuration.\n' +
      'Example:\n' +
      '{\n' +
      '  "defaultServer": "production",\n' +
      '  "servers": {\n' +
      '    "production": {\n' +
      '      "host": "your-server.com",\n' +
      '      "user": "root",\n' +
      '      "keyPath": "~/.ssh/id_rsa"\n' +
      '    }\n' +
      '  }\n' +
      '}'
    );
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as Config;

    // Validate config
    if (!config.defaultServer || !config.servers) {
      throw new Error('Config must have "defaultServer" and "servers" fields');
    }

    if (!config.servers[config.defaultServer]) {
      throw new Error(`Default server "${config.defaultServer}" not found in servers configuration`);
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

export function getServerConfig(config: Config, serverName?: string): ServerConfig {
  const name = serverName || config.defaultServer;
  const server = config.servers[name];

  if (!server) {
    throw new Error(`Server "${name}" not found in configuration`);
  }

  return {
    ...server,
    port: server.port || 22,
    keyPath: server.keyPath.replace('~', homedir())
  };
}
