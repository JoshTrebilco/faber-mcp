import { Client, ClientChannel } from 'ssh2';
import { readFileSync } from 'fs';
import { ServerConfig } from './config.js';

export interface SSHResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class SSHClient {
  private client: Client;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.client = new Client();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client
        .on('ready', () => resolve())
        .on('error', (err) => reject(err))
        .connect({
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.user,
          privateKey: readFileSync(this.config.keyPath)
        });
    });
  }

  async exec(command: string, timeout: number = 300000): Promise<SSHResult> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const timeoutId = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);

      this.client.exec(command, (err, stream: ClientChannel) => {
        if (err) {
          clearTimeout(timeoutId);
          reject(err);
          return;
        }

        stream
          .on('close', (code: number) => {
            clearTimeout(timeoutId);
            resolve({ stdout, stderr, exitCode: code });
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  async disconnect(): Promise<void> {
    this.client.end();
  }
}

export async function executeCommand(
  config: ServerConfig,
  command: string,
  timeout?: number
): Promise<SSHResult> {
  const client = new SSHClient(config);
  
  try {
    await client.connect();
    const result = await client.exec(command, timeout);
    await client.disconnect();
    return result;
  } catch (error) {
    await client.disconnect();
    throw error;
  }
}
