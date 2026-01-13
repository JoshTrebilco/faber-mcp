# Quick Start Guide

Get up and running with Faber MCP in 5 minutes.

## 1. Install

```bash
cd ~/Code/faber-mcp
npm install
npm run build
npm link
```

## 2. Configure

```bash
# Copy example config
cp example-config.json ~/.faber-mcp.json

# Edit with your server details
nano ~/.faber-mcp.json
```

Update the `host` field with your Faber server address.

## 3. Add to Cursor

Create or edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "faber": {
      "command": "faber-mcp"
    }
  }
}
```

## 4. Restart Cursor

Completely quit and restart Cursor.

## 5. Test

Open any Laravel project in Cursor and ask:

> "Can you check the production server status?"

If the tool executes successfully, you're all set!

## Next Steps

- Deploy your first app: "Deploy this project to production"
- See [README.md](README.md) for full documentation
- See [INSTALL.md](INSTALL.md) for troubleshooting

## Example Deployment Flow

You: "Deploy this project to production"

Agent will:

1. Check if app exists
2. If not, ask for project name, repo URL, domain, etc.
3. Show GitHub authorization prompt (if needed)
4. Create full stack with SSL
5. Return credentials and deployment status

All without leaving Cursor!
