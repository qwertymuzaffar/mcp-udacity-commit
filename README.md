# mcp-udacity-commit

[![npm version](https://img.shields.io/npm/v/mcp-udacity-commit)](https://www.npmjs.com/package/mcp-udacity-commit)
[![npm downloads](https://img.shields.io/npm/dm/mcp-udacity-commit)](https://www.npmjs.com/package/mcp-udacity-commit)
[![License: MIT](https://img.shields.io/npm/l/mcp-udacity-commit)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-server-blue)](https://modelcontextprotocol.io)

An [MCP](https://modelcontextprotocol.io) server that validates and formats git
commit messages according to the
[Udacity Git Commit Message Style Guide](https://udacity.github.io/git-styleguide/).

## Install

One line — paste it into your terminal:

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

<details>
<summary>Install from source</summary>

```bash
git clone https://github.com/qwertymuzaffar/mcp-udacity-commit
cd mcp-udacity-commit
npm install
npm run build
claude mcp add udacity-commit -- node "$(pwd)/build/index.js"
```

</details>

## What it exposes

| Primitive | Name | Purpose |
| --- | --- | --- |
| Resource | `udacity://commit-styleguide` | The style-guide rules, as markdown |
| Tool | `validate_commit_message` | Checks a message against every rule (type, ≤50-char subject, capitalization, no trailing period, blank line, ≤72-char body wrap) |
| Tool | `format_commit_message` | Builds a compliant message from `type` + `subject` + optional `body`/`footer` |

## Example

`format_commit_message` turns loose parts into a compliant commit:

```text
in:  type=fix  subject="prevent duplicate auth token refresh."
     body="The refresh timer could fire twice under load, minting two tokens…"
     footer="Resolves: #142"

out:
fix: Prevent duplicate auth token refresh

The refresh timer could fire twice under load, minting two tokens and
logging the user out. Serialize refreshes behind a single in-flight
promise so concurrent callers await the same request.

Resolves: #142
```

`validate_commit_message` flags every violation:

```text
"Fixed the login bug."  →  ❌ Not compliant.
  • Subject must follow "type: Subject".
  • Subject must not end with a period.
```

## Develop

```bash
npm install
npm run build          # → build/index.js
npm run test:client    # spawns the server and exercises the tools
```

## License

MIT
