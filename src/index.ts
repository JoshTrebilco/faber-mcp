#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig, getServerConfig } from './config.js';
import { checkApp, listApps, getDeployKey } from './tools/app.js';
import { createStack } from './tools/stack.js';
import { deploy } from './tools/deploy.js';
import { getServerStatus, restartService } from './tools/server.js';
import { listDomains, createDomain } from './tools/domain.js';
import { listDatabases, createDatabase } from './tools/database.js';
import { listReleases, rollback } from './tools/releases.js';
import { getWebhookLogs, getAppLogs } from './tools/logs.js';
import { getEnv, setEnvVar } from './tools/env.js';

const server = new Server(
  {
    name: 'faber-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // App Management
      {
        name: 'faber_check_app',
        description: 'Check if an app exists on the Faber server and get its details',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The app username to check'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'faber_list_apps',
        description: 'List all deployed apps on the Faber server',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          }
        }
      },
      {
        name: 'faber_create_stack',
        description: 'Create a full application stack (app + domain + database + SSL + .env). Handles GitHub Device Flow OAuth for automatic deploy key setup if configured on server.',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'Username for the app (lowercase, alphanumeric)'
            },
            repository: {
              type: 'string',
              description: 'Git repository URL (HTTPS or SSH)'
            },
            domain: {
              type: 'string',
              description: 'Domain name for the app'
            },
            branch: {
              type: 'string',
              description: 'Git branch (default: main)'
            },
            php: {
              type: 'string',
              description: 'PHP version (default: 8.4)'
            },
            dbname: {
              type: 'string',
              description: 'Database name (defaults to username)'
            },
            skipDb: {
              type: 'boolean',
              description: 'Skip database creation'
            },
            skipDomain: {
              type: 'boolean',
              description: 'Skip domain creation'
            },
            skipEnv: {
              type: 'boolean',
              description: 'Skip .env configuration'
            },
            skipDeploy: {
              type: 'boolean',
              description: 'Skip initial deployment'
            },
            skipReverb: {
              type: 'boolean',
              description: 'Skip Reverb WebSocket configuration'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['user', 'repository']
        }
      },
      {
        name: 'faber_deploy',
        description: 'Trigger a zero-downtime deployment for an app',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The app username to deploy'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['username']
        }
      },
      {
        name: 'faber_get_deploy_key',
        description: 'Retrieve the SSH public key for an app (used for manual deploy key setup)',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The app username'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['username']
        }
      },
      
      // Server Management
      {
        name: 'faber_server_status',
        description: 'Get server health and service status',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          }
        }
      },
      {
        name: 'faber_service_restart',
        description: 'Restart a system service (nginx, php, mysql, supervisor, redis)',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name: nginx, php, mysql, supervisor, or redis',
              enum: ['nginx', 'php', 'mysql', 'supervisor', 'redis']
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['service']
        }
      },
      
      // Domain Management
      {
        name: 'faber_list_domains',
        description: 'List all configured domains on the Faber server',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          }
        }
      },
      {
        name: 'faber_create_domain',
        description: 'Create and assign a domain to an app (includes SSL setup)',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name'
            },
            app: {
              type: 'string',
              description: 'App username to assign the domain to'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['domain', 'app']
        }
      },
      
      // Database Management
      {
        name: 'faber_list_databases',
        description: 'List all databases on the Faber server',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          }
        }
      },
      {
        name: 'faber_create_database',
        description: 'Create a new MySQL database with a dedicated user',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Database name (auto-generated if not provided)'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          }
        }
      },
      
      // Release Management
      {
        name: 'faber_list_releases',
        description: 'List all available releases for an app',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The app username'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['username']
        }
      },
      {
        name: 'faber_rollback',
        description: 'Roll back an app to a previous release',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The app username'
            },
            release: {
              type: 'string',
              description: 'Release name (timestamp) - optional, defaults to previous release'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['username']
        }
      },
      
      // Logs & Debugging
      {
        name: 'faber_webhook_logs',
        description: 'View webhook execution logs',
        inputSchema: {
          type: 'object',
          properties: {
            lines: {
              type: 'number',
              description: 'Number of lines to show (default: 50)'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          }
        }
      },
      {
        name: 'faber_app_logs',
        description: 'View Laravel application logs for an app',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The app username'
            },
            lines: {
              type: 'number',
              description: 'Number of lines to show (default: 50)'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['username']
        }
      },
      
      // Environment
      {
        name: 'faber_get_env',
        description: 'Read the .env file for an app (read-only)',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The app username'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['username']
        }
      },
      {
        name: 'faber_set_env_var',
        description: 'Set a specific environment variable in an app\'s .env file',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The app username'
            },
            key: {
              type: 'string',
              description: 'Environment variable name (e.g., APP_DEBUG)'
            },
            value: {
              type: 'string',
              description: 'Environment variable value'
            },
            server: {
              type: 'string',
              description: 'Server name from config (optional, defaults to defaultServer)'
            }
          },
          required: ['username', 'key', 'value']
        }
      }
    ]
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Load config
    const config = loadConfig();
    const serverConfig = getServerConfig(config, (args as any).server);

    switch (name) {
      // App Management
      case 'faber_check_app':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await checkApp(serverConfig, (args as any).name), null, 2)
            }
          ]
        };

      case 'faber_list_apps':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await listApps(serverConfig), null, 2)
            }
          ]
        };

      case 'faber_create_stack': {
        const result = await createStack(serverConfig, args as any);
        
        // If device flow detected, format it nicely
        if (result.deviceFlow) {
          const message = [
            '='.repeat(50),
            'GitHub Authorization Required',
            '='.repeat(50),
            '',
            `1. Open: ${result.deviceFlow.verificationUri}`,
            `2. Enter code: ${result.deviceFlow.userCode}`,
            '',
            'Waiting for authorization...',
            '',
            '='.repeat(50),
            '',
            'Full output:',
            result.output
          ].join('\n');
          
          return {
            content: [
              {
                type: 'text',
                text: message
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'faber_deploy':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await deploy(serverConfig, (args as any).username), null, 2)
            }
          ]
        };

      case 'faber_get_deploy_key': {
        const result = await getDeployKey(serverConfig, (args as any).username);
        const message = [
          result.instructions,
          '',
          'Public Key:',
          '─'.repeat(50),
          result.publicKey,
          '─'.repeat(50)
        ].join('\n');
        
        return {
          content: [
            {
              type: 'text',
              text: message
            }
          ]
        };
      }

      // Server Management
      case 'faber_server_status':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getServerStatus(serverConfig), null, 2)
            }
          ]
        };

      case 'faber_service_restart':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await restartService(serverConfig, (args as any).service), null, 2)
            }
          ]
        };

      // Domain Management
      case 'faber_list_domains':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await listDomains(serverConfig), null, 2)
            }
          ]
        };

      case 'faber_create_domain':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await createDomain(serverConfig, (args as any).domain, (args as any).app), null, 2)
            }
          ]
        };

      // Database Management
      case 'faber_list_databases':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await listDatabases(serverConfig), null, 2)
            }
          ]
        };

      case 'faber_create_database':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await createDatabase(serverConfig, (args as any).name), null, 2)
            }
          ]
        };

      // Release Management
      case 'faber_list_releases':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await listReleases(serverConfig, (args as any).username), null, 2)
            }
          ]
        };

      case 'faber_rollback':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await rollback(serverConfig, (args as any).username, (args as any).release), null, 2)
            }
          ]
        };

      // Logs & Debugging
      case 'faber_webhook_logs':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getWebhookLogs(serverConfig, (args as any).lines || 50), null, 2)
            }
          ]
        };

      case 'faber_app_logs':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getAppLogs(serverConfig, (args as any).username, (args as any).lines || 50), null, 2)
            }
          ]
        };

      // Environment
      case 'faber_get_env':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getEnv(serverConfig, (args as any).username), null, 2)
            }
          ]
        };

      case 'faber_set_env_var':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await setEnvVar(serverConfig, (args as any).username, (args as any).key, (args as any).value),
                null,
                2
              )
            }
          ]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Faber MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
