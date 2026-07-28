# mcp-udacity-commit

An [MCP](https://modelcontextprotocol.io) server that validates and formats git
commit messages according to the
[Udacity Git Commit Message Style Guide](https://udacity.github.io/git-styleguide/).

## What it exposes

| Primitive | Name | Purpose |
| --- | --- | --- |
| Resource | `udacity://commit-styleguide` | The style-guide rules, as markdown |
| Tool | `validate_commit_message` | Checks a message against every rule (type, ≤50-char subject, capitalization, no trailing period, blank line, ≤72-char body wrap) |
| Tool | `format_commit_message` | Builds a compliant message from `type` + `subject` + optional `body`/`footer` |

## Install (published package)

```bash
claude mcp add udacity-commit -- npx -y mcp-udacity-commit
```

For Claude Desktop, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "udacity-commit": {
      "command": "npx",
      "args": ["-y", "mcp-udacity-commit"]
    }
  }
}
```

## Install from source

```bash
git clone https://github.com/qwertymuzaffar/mcp-udacity-commit
cd mcp-udacity-commit
npm install
npm run build
claude mcp add udacity-commit -- node "$(pwd)/build/index.js"
```

## Develop

```bash
npm install
npm run build          # → build/index.js
npm run test:client    # spawns the server and exercises the tools
```

## Publish

```bash
# 1. npm
npm publish --access public

# 2. MCP Registry (after npm publish)
mcp-publisher login github
mcp-publisher publish
```

## License

MIT
