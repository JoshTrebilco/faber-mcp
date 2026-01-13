# Installation Guide

## Quick Start

### 1. Install Dependencies and Build

```bash
cd ~/Code/faber-mcp
npm install
npm run build
npm link  # Makes faber-mcp available globally
```

### 2. Create Server Configuration

Create `~/.faber-mcp.json`:

```bash
cat > ~/.faber-mcp.json << 'EOF'
{
  "defaultServer": "production",
  "servers": {
    "production": {
      "host": "your-server.com",
      "user": "root",
      "keyPath": "~/.ssh/id_rsa",
      "port": 22
    }
  }
}
EOF
```

Replace `your-server.com` with your actual Faber server hostname or IP address.

### 3. Configure Cursor

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

### 4. Restart Cursor

Completely quit and restart Cursor for the MCP server to be recognized.

## Verify Installation

### Test SSH Connection

```bash
ssh -i ~/.ssh/id_rsa root@your-server.com "faber version"
```

You should see the Faber version output.

### Test MCP Server

In Cursor, open any project and ask:

> "Can you check the production server status?"

The agent should use the `faber_server_status` tool to connect to your server.

## Configuration Examples

### Multiple Servers

```json
{
  "defaultServer": "production",
  "servers": {
    "production": {
      "host": "prod.example.com",
      "user": "root",
      "keyPath": "~/.ssh/id_rsa"
    },
    "staging": {
      "host": "staging.example.com",
      "user": "root",
      "keyPath": "~/.ssh/id_rsa"
    },
    "development": {
      "host": "dev.example.com",
      "user": "root",
      "keyPath": "~/.ssh/id_rsa",
      "port": 2222
    }
  }
}
```

### Different SSH Keys Per Server

```json
{
  "defaultServer": "production",
  "servers": {
    "production": {
      "host": "prod.example.com",
      "user": "root",
      "keyPath": "~/.ssh/prod_rsa"
    },
    "staging": {
      "host": "staging.example.com",
      "user": "root",
      "keyPath": "~/.ssh/staging_rsa"
    }
  }
}
```

## Troubleshooting

### "Config file not found" Error

Make sure `~/.faber-mcp.json` exists and has valid JSON syntax.

Test:

```bash
cat ~/.faber-mcp.json | jq .
```

### "Command not found: faber-mcp"

After `npm link`, make sure the npm global bin directory is in your PATH:

```bash
npm bin -g
# Should output something like /usr/local/bin

echo $PATH
# Should include /usr/local/bin
```

### "Permission denied" SSH Errors

```bash
# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa

# Test SSH connection
ssh -i ~/.ssh/id_rsa root@your-server.com
```

### Cursor MCP Logs

View MCP logs in Cursor:

1. View → Output
2. Select "MCP" from the dropdown

Look for any connection or authentication errors.

## Updating

```bash
cd ~/Code/faber-mcp
git pull
npm install
npm run build
```

The global link will automatically use the updated version.
