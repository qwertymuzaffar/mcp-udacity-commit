#!/usr/bin/env node
import { createRequire } from "node:module";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { STYLE_GUIDE, BRANCH_GUIDE, validate, formatMessage, validateBranch } from "./lint.js";
import type { Report } from "./lint.js";

/** The published version, read from package.json so a release cannot leave it behind. */
const { version: VERSION } = createRequire(import.meta.url)("../package.json") as { version: string };

/** The `{ valid, problems, warnings }` fields every tool reports. */
const REPORT_SHAPE = {
  valid: z.boolean(),
  problems: z.array(z.string()),
  warnings: z.array(z.string()),
};

/** A verdict line, then one bullet per problem and one per warning. */
function renderReport(report: Report, verdict: { ok: string; fail: string }): string {
  return [
    report.valid ? verdict.ok : verdict.fail,
    ...report.problems.map((problem) => `  • ${problem}`),
    ...report.warnings.map((warning) => `  ⚠ ${warning}`),
  ].join("\n");
}

/** A tool result: the text for humans, the report (plus any extra fields) for machines. */
function reportResult(report: Report, text: string, extra: Record<string, unknown> = {}) {
  const structuredContent: Record<string, unknown> = {
    ...extra,
    valid: report.valid,
    problems: report.problems,
    warnings: report.warnings,
  };
  return { content: [{ type: "text" as const, text }], structuredContent };
}

interface ValidatorSpec {
  title: string;
  description: string;
  /** The single string argument: its name and description. */
  input: { name: string; description: string };
  check: (value: string) => Report;
  verdict: { ok: string; fail: string };
}

/** Registers a tool that takes one string, checks it and reports the verdict. */
function registerValidator(server: McpServer, name: string, spec: ValidatorSpec): void {
  server.registerTool(
    name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: { [spec.input.name]: z.string().describe(spec.input.description) },
      outputSchema: REPORT_SHAPE,
    },
    async (args) => {
      const report = spec.check(args[spec.input.name]);
      return reportResult(report, renderReport(report, spec.verdict));
    }
  );
}

function registerFormatter(server: McpServer): void {
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
      outputSchema: { message: z.string(), ...REPORT_SHAPE },
    },
    async (input) => {
      const { message, report } = formatMessage(input);
      const note = !report.valid
        ? "❌ " + [...report.problems, ...report.warnings].join("; ")
        : report.warnings.length
          ? "✅ compliant (hint: " + report.warnings.join("; ") + ")"
          : "✅ compliant";
      return reportResult(report, `${message}\n\n--- ${note}`, { message });
    }
  );
}

function registerResources(server: McpServer): void {
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
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "udacity-commit", version: VERSION });
  registerResources(server);

  registerValidator(server, "validate_commit_message", {
    title: "Validate a commit message",
    description:
      "Check a commit message against the Udacity Git Commit Message Style Guide. " +
      "Returns whether it is compliant plus any problems (violations) and warnings (hints).",
    input: { name: "message", description: "The full commit message to check" },
    check: validate,
    verdict: { ok: "✅ Compliant with the Udacity style guide.", fail: "❌ Not compliant." },
  });

  registerFormatter(server);

  registerValidator(server, "validate_branch_name", {
    title: "Validate a git branch name",
    description:
      "Check a git branch name against the companion type/kebab-case convention " +
      '(e.g. "feat/add-dark-mode"). Returns whether it is compliant plus any problems ' +
      "(violations) and warnings (hints). Base branches like main/master are exempt.",
    input: { name: "name", description: 'The branch name to check, e.g. "feat/add-dark-mode"' },
    check: validateBranch,
    verdict: { ok: "✅ Compliant branch name.", fail: "❌ Not compliant." },
  });

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
