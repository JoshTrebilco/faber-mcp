import { Client, ClientChannel } from 'ssh2';
import { readFileSync, appendFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ServerConfig } from './config.js';

// Progress log file path - can be monitored externally
export const PROGRESS_LOG_PATH = join(tmpdir(), 'faber-mcp-progress.log');

// Progress callback type for streaming updates
export type ProgressCallback = (message: string, progress?: number, total?: number) => void;

export interface SSHResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  deviceFlow?: {
    verificationUri: string;
    userCode: string;
  };
  // If true, the command is still running (returned early for device flow)
  pending?: boolean;
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

  async exec(command: string, timeout: number = 300000, options: { debug?: boolean; detectDeviceFlow?: boolean; onProgress?: ProgressCallback } = {}): Promise<SSHResult> {
    const { debug = false, detectDeviceFlow = false, onProgress } = options;
    
    // Initialize progress log
    const timestamp = new Date().toISOString();
    writeFileSync(PROGRESS_LOG_PATH, `[${timestamp}] Starting command: ${command}\n`);
    
    let progressCount = 0;
    const logProgress = (prefix: string, message: string) => {
      const ts = new Date().toISOString();
      const clean = message.replace(/\x1B\[[0-9;]*m/g, '').trim();
      if (clean) {
        appendFileSync(PROGRESS_LOG_PATH, `[${ts}] ${prefix}: ${clean}\n`);
        if (debug) {
          console.error(`[${prefix}] ${clean}`);
        }
        // Send progress notification if callback provided
        if (onProgress) {
          progressCount++;
          onProgress(`[${prefix}] ${clean}`, progressCount);
        }
      }
    };
    
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          logProgress('TIMEOUT', `Command timed out after ${timeout}ms`);
          reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
        }
      }, timeout);

      logProgress('SSH', `Executing command...`);

      this.client.exec(command, (err, stream: ClientChannel) => {
        if (err) {
          clearTimeout(timeoutId);
          logProgress('ERROR', `Exec error: ${err.message}`);
          reject(err);
          return;
        }

        logProgress('SSH', 'Command started, waiting for output...');

        // Helper to check for device flow pattern in output
        const checkDeviceFlow = () => {
          if (!detectDeviceFlow || resolved) return;
          
          // Check combined output for device flow prompt
          const combined = stdout + stderr;
          
          // Look for GitHub device flow pattern (more flexible matching)
          const uriMatch = combined.match(/Open:\s*(https:\/\/github\.com\/login\/device)/i);
          const codeMatch = combined.match(/Enter code:\s*([A-Z0-9]+-[A-Z0-9]+)/i);
          
          if (uriMatch && codeMatch) {
            logProgress('DEVICE_FLOW', `Detected! URI: ${uriMatch[1]}, Code: ${codeMatch[1]}`);
            resolved = true;
            clearTimeout(timeoutId);
            
            // Return immediately with device flow info
            resolve({
              stdout,
              stderr,
              exitCode: -1, // Not yet complete
              deviceFlow: {
                verificationUri: uriMatch[1],
                userCode: codeMatch[1]
              },
              pending: true
            });
          }
        };

        stream
          .on('close', (code: number) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              logProgress('SSH', `Command completed with exit code: ${code}`);
              resolve({ stdout, stderr, exitCode: code });
            }
          })
          .on('data', (data: Buffer) => {
            const chunk = data.toString();
            stdout += chunk;
            logProgress('STDOUT', chunk);
            checkDeviceFlow();
          })
          .stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            stderr += chunk;
            logProgress('STDERR', chunk);
            checkDeviceFlow();
          });
      });
    });
  }

  async disconnect(): Promise<void> {
    this.client.end();
  }
}

export interface ExecuteOptions {
  timeout?: number;
  debug?: boolean;
  detectDeviceFlow?: boolean;
  onProgress?: ProgressCallback;
}

export async function executeCommand(
  config: ServerConfig,
  command: string,
  options: ExecuteOptions = {}
): Promise<SSHResult> {
  const { timeout = 300000, debug = false, detectDeviceFlow = false, onProgress } = options;
  const client = new SSHClient(config);
  
  try {
    if (debug) console.error(`[SSH DEBUG] Connecting to ${config.host}...`);
    if (onProgress) onProgress('Connecting to server...');
    await client.connect();
    if (debug) console.error(`[SSH DEBUG] Connected!`);
    if (onProgress) onProgress('Connected, executing command...');
    const result = await client.exec(command, timeout, { debug, detectDeviceFlow, onProgress });
    
    // Don't disconnect if command is pending (device flow detected)
    // The command will continue running on the server
    if (!result.pending) {
      await client.disconnect();
    }
    
    return result;
  } catch (error) {
    if (debug) console.error(`[SSH DEBUG] Error: ${error}`);
    await client.disconnect();
    throw error;
  }
}
