# Contributing to Faber MCP

Thank you for your interest in contributing to Faber MCP!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/JoshTrebilco/faber-mcp.git
   cd faber-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Make your changes in `src/`

4. Build and test:
   ```bash
   npm run build
   ```

5. Test locally:
   ```bash
   npm link  # Install globally for testing
   # Then use in Cursor
   ```

## Project Structure

```
src/
  index.ts          # MCP server entry point and tool registration
  config.ts         # Configuration loading from ~/.faber-mcp.json
  ssh.ts            # SSH client wrapper for remote command execution
  tools/
    app.ts          # App management (check, list, deploy key)
    stack.ts        # Stack creation (full provisioning)
    deploy.ts       # Deployment triggering
    server.ts       # Server status and service management
    domain.ts       # Domain management
    database.ts     # Database management
    releases.ts     # Release listing and rollback
    logs.ts         # Log viewing
    env.ts          # Environment variable management
```

## Adding New Tools

To add a new tool:

1. Create a new function in the appropriate file in `src/tools/`
2. Add the tool definition to the `ListToolsRequestSchema` handler in `src/index.ts`
3. Add the tool execution case to the `CallToolRequestSchema` handler in `src/index.ts`

Example:

```typescript
// In src/tools/app.ts
export async function deleteApp(config: ServerConfig, username: string) {
  const result = await executeCommand(config, `faber app delete ${username} --force`);
  return {
    success: result.exitCode === 0,
    output: result.stdout
  };
}

// In src/index.ts - add to tool definitions
{
  name: 'faber_delete_app',
  description: 'Delete an app from the Faber server',
  inputSchema: {
    type: 'object',
    properties: {
      username: { type: 'string', description: 'App username to delete' },
      server: { type: 'string', description: 'Server name (optional)' }
    },
    required: ['username']
  }
}

// In src/index.ts - add to switch statement
case 'faber_delete_app':
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(await deleteApp(serverConfig, (args as any).username), null, 2)
    }]
  };
```

## Code Style

- Use TypeScript strict mode
- Use async/await for asynchronous operations
- Include proper error handling
- Add JSDoc comments for public functions
- Parse Faber CLI output to provide structured data when possible

## Testing

Before submitting a PR:

1. Build successfully: `npm run build`
2. Test with a real Faber server
3. Ensure error handling works properly
4. Update README if adding new tools

## Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Commit with clear messages: `git commit -m "Add feature X"`
5. Push to your fork: `git push origin feature/my-feature`
6. Open a Pull Request

## Questions?

Open an issue or discussion on GitHub!
