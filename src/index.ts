#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { STYLE_GUIDE, BRANCH_GUIDE, validate, formatMessage, validateBranch } from "./lint.js";

const VERSION = "1.2.0";

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

  server.registerResource(
    "branch-naming",
    "udacity://branch-naming",
    {
      title: "Branch Naming (companion convention)",
      description: "type/kebab-case branch-naming rules that pair with the commit style.",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, text: BRANCH_GUIDE }] })
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
      const report = validate(message);
      const text = [
        report.valid ? "✅ Compliant with the Udacity style guide." : "❌ Not compliant.",
        ...report.problems.map((problem) => `  • ${problem}`),
        ...report.warnings.map((warning) => `  ⚠ ${warning}`),
      ].join("\n");
      const structuredContent: Record<string, unknown> = {
        valid: report.valid,
        problems: report.problems,
        warnings: report.warnings,
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

  server.registerTool(
    "validate_branch_name",
    {
      title: "Validate a git branch name",
      description:
        "Check a git branch name against the companion type/kebab-case convention " +
        '(e.g. "feat/add-dark-mode"). Returns whether it is compliant plus any problems ' +
        "(violations) and warnings (hints). Base branches like main/master are exempt.",
      inputSchema: { name: z.string().describe('The branch name to check, e.g. "feat/add-dark-mode"') },
      outputSchema: {
        valid: z.boolean(),
        problems: z.array(z.string()),
        warnings: z.array(z.string()),
      },
    },
    async ({ name }) => {
      const report = validateBranch(name);
      const text = [
        report.valid ? "✅ Compliant branch name." : "❌ Not compliant.",
        ...report.problems.map((problem) => `  • ${problem}`),
        ...report.warnings.map((warning) => `  ⚠ ${warning}`),
      ].join("\n");
      const structuredContent: Record<string, unknown> = {
        valid: report.valid,
        problems: report.problems,
        warnings: report.warnings,
      };
      return { content: [{ type: "text", text }], structuredContent };
    }
  );

  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
