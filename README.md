# Faber MCP Server

MCP (Model Context Protocol) server for deploying Laravel applications to [Faber](https://github.com/JoshTrebilco/faber) servers directly from Cursor.

## Overview

Faber MCP enables you to deploy and manage Laravel applications on Faber servers using AI agents in Cursor. Simply ask your AI assistant to "deploy this project to production" and it handles the rest - including provisioning new stacks, managing GitHub deploy keys, and triggering deployments.

### Features

- Deploy Laravel apps from Cursor with natural language commands
- Available globally across all your projects
- Multi-server support (production, staging, etc.)
- Automatic GitHub deploy key setup via Device Flow OAuth
- Full stack management (apps, domains, databases, SSL)
- Release management and rollbacks
- Real-time logs and debugging

## Installation

### Option 1: Install from npm (when published)

```bash
npm install -g faber-mcp
```

### Option 2: Install from source

```bash
git clone https://github.com/JoshTrebilco/faber-mcp.git
cd faber-mcp
npm install
npm run build
npm link  # Makes it available globally
```

## Configuration

### Step 1: Create Server Configuration

Create `~/.faber-mcp.json` with your Faber server details.

You can copy `example-config.json` as a starting point:

```bash
cp example-config.json ~/.faber-mcp.json
# Edit with your server details
nano ~/.faber-mcp.json
```

Or create it from scratch:

```json
{
  "defaultServer": "production",
  "servers": {
    "production": {
      "host": "your-production-server.com",
      "user": "root",
      "keyPath": "~/.ssh/id_rsa",
      "port": 22
    },
    "staging": {
      "host": "staging.example.com",
      "user": "root",
      "keyPath": "~/.ssh/id_rsa"
    }
  }
}
```

**Requirements:**

- SSH key must have access to the Faber server
- `faber` CLI must be installed on the server
- You must be able to authenticate as root

### Step 2: Configure Cursor

Edit `~/.cursor/mcp.json` (create if it doesn't exist):

```json
{
  "mcpServers": {
    "faber": {
      "command": "faber-mcp"
    }
  }
}
```

**Alternative configurations:**

If Cursor can't find the global command, use the full path:

```json
{
  "mcpServers": {
    "faber": {
      "command": "node",
      "args": ["/usr/local/lib/node_modules/faber-mcp/dist/index.js"]
    }
  }
}
```

Or use npx (no global install needed):

```json
{
  "mcpServers": {
    "faber": {
      "command": "npx",
      "args": ["-y", "faber-mcp"]
    }
  }
}
```

**Important:** Restart Cursor completely after adding the MCP server configuration.

## Usage Examples

### Deploy Current Project

Simply ask Cursor's AI agent:

> "Deploy this project to production"

The agent will:

1. Check if the app already exists on the server
2. If not, prompt you for:
   - Project name (username in Faber)
   - Git repository URL
   - Domain name
   - PHP version
   - Git branch
3. Create the full stack (app, domain, database, SSL, .env)
4. **GitHub Authorization** (if GitHub OAuth is configured on server):
   - Cursor will display a message like:

     ```
     GitHub Authorization Required

     1. Open: https://github.com/login/device
     2. Enter code: A1B2-C3D4

     Waiting for authorization...
     ```

   - Click the verification URI and enter the code
   - Authorize the application in your browser
   - Server automatically adds the deploy key to your repository
5. Or if the app exists, trigger a deployment

### Other Commands

> "Check if myapp is deployed on production"

> "List all apps on the production server"

> "Rollback myapp to the previous release"

> "Show me the production server status"

> "Deploy this to staging server"

### Multi-Server Support

When using multiple servers, specify which one:

> "Deploy this to staging server"

The agent will use the `staging` profile from your config. If not specified, it uses `defaultServer`.

## Available Tools

The MCP server provides these tools to Cursor's AI agent:

### App Management

- `faber_check_app` - Check if an app exists and get details
- `faber_list_apps` - List all deployed apps
- `faber_create_stack` - Create full application stack (handles GitHub deploy key setup)
- `faber_deploy` - Trigger zero-downtime deployment
- `faber_get_deploy_key` - Retrieve SSH public key for an app (for manual GitHub setup)

### Server Management

- `faber_server_status` - Get server health and service status
- `faber_service_restart` - Restart services (nginx, php, mysql, redis)

### Domain Management

- `faber_list_domains` - List configured domains
- `faber_create_domain` - Create/assign domain to app

### Database Management

- `faber_list_databases` - List all databases
- `faber_create_database` - Create a new database

### Release Management

- `faber_list_releases` - List available releases for an app
- `faber_rollback` - Rollback to a previous release

### Logs & Debugging

- `faber_webhook_logs` - View webhook execution logs
- `faber_app_logs` - View Laravel application logs

### Environment

- `faber_get_env` - Read .env file (read-only)
- `faber_set_env_var` - Set a specific .env variable

## Troubleshooting

### MCP server not connecting

- Verify SSH key has access: `ssh -i ~/.ssh/id_rsa root@your-server.com`
- Check `~/.faber-mcp.json` syntax is valid JSON
- Ensure `faber` CLI is installed on the server: `ssh root@server "which faber"`

### Cursor not recognizing tools

- Restart Cursor completely after adding MCP config
- Check Cursor's MCP logs: View → Output → Select "MCP" from dropdown
- Verify the path in `~/.cursor/mcp.json` is correct and absolute

### SSH connection errors

- Test SSH connection manually first
- Ensure SSH key permissions: `chmod 600 ~/.ssh/id_rsa`
- Check server firewall allows SSH on port 22

### Faber commands failing

- Verify you're running as root on the server
- Check Faber is installed: `ssh root@server "faber version"`
- Review server logs: `ssh root@server "faber logs"`

## Requirements

- Node.js 18+ (for running the MCP server locally)
- SSH access to Faber server(s)
- Faber CLI installed on target server(s)
- Cursor IDE with MCP support

## Development

```bash
# Clone the repository
git clone https://github.com/JoshTrebilco/faber-mcp.git
cd faber-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build

# Or watch mode
npm run dev
```

## License

MIT

## Links

- [Faber Server](https://github.com/JoshTrebilco/faber) - Laravel server management CLI
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol specification
