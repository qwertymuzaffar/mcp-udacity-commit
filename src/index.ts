#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { STYLE_GUIDE, validate, formatMessage } from "./lint.js";

const VERSION = "1.0.2";

export function createServer(): McpServer {
  const server = new McpServer({ name: "udacity-commit", version: VERSION });

  server.registerResource(
    "styleguide",
    "udacity://commit-styleguide",
    {
      title: "Udacity Git Commit Style Guide",
      description: "The commit-message rules (types, subject, body, footer).",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, text: STYLE_GUIDE }] })
  );

  server.registerTool(
    "validate_commit_message",
    {
      title: "Validate a commit message",
      description:
        "Check a commit message against the Udacity Git Commit Message Style Guide. " +
        "Returns whether it is compliant plus any problems (violations) and warnings (hints).",
      inputSchema: { message: z.string().describe("The full commit message to check") },
      outputSchema: {
        valid: z.boolean(),
        problems: z.array(z.string()),
        warnings: z.array(z.string()),
      },
    },
    async ({ message }) => {
      const r = validate(message);
      const text = [
        r.valid ? "✅ Compliant with the Udacity style guide." : "❌ Not compliant.",
        ...r.problems.map((p) => `  • ${p}`),
        ...r.warnings.map((w) => `  ⚠ ${w}`),
      ].join("\n");
      const structuredContent: Record<string, unknown> = {
        valid: r.valid,
        problems: r.problems,
        warnings: r.warnings,
      };
      return { content: [{ type: "text", text }], structuredContent };
    }
  );

  server.registerTool(
    "format_commit_message",
    {
      title: "Format a Udacity-style commit message",
      description:
        "Compose a compliant commit message from its parts. The subject is capitalized, " +
        "a trailing period is removed, and the body is wrapped at 72 characters.",
      inputSchema: {
        type: z.enum(["feat", "fix", "docs", "style", "refactor", "test", "chore"]),
        subject: z.string().describe("Imperative subject; auto-capitalized, trailing period removed"),
        body: z.string().optional().describe("What & why; auto-wrapped at 72 chars"),
        footer: z.string().optional().describe('Issue refs, e.g. "Resolves: #123"'),
      },
      outputSchema: {
        message: z.string(),
        valid: z.boolean(),
        problems: z.array(z.string()),
        warnings: z.array(z.string()),
      },
    },
    async (input) => {
      const { message, report } = formatMessage(input);
      const note = !report.valid
        ? "❌ " + [...report.problems, ...report.warnings].join("; ")
        : report.warnings.length
          ? "✅ compliant (hint: " + report.warnings.join("; ") + ")"
          : "✅ compliant";
      const structuredContent: Record<string, unknown> = {
        message,
        valid: report.valid,
        problems: report.problems,
        warnings: report.warnings,
      };
      return {
        content: [{ type: "text", text: `${message}\n\n--- ${note}` }],
        structuredContent,
      };
    }
  );

  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
