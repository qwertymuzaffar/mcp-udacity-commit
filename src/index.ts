#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SUBJECT_MAX = 50;
const BODY_WRAP = 72;

const TYPES: Record<string, string> = {
  feat: "A new feature",
  fix: "A bug fix",
  docs: "Changes to documentation",
  style: "Formatting, missing semicolons, etc; no code change",
  refactor: "Refactoring production code",
  test: "Adding tests, refactoring tests; no production code change",
  chore: "Updating build tasks, package configs, etc; no production code change",
};

const STYLE_GUIDE = `# Udacity Git Commit Message Style Guide

A commit message has three parts separated by blank lines: **subject**, optional **body**, optional **footer**.

    type: Subject

    Body — the what and why, not the how.

    Resolves: #123
    See also: #456, #789

## Types
${Object.entries(TYPES)
  .map(([t, d]) => `- **${t}**: ${d}`)
  .join("\n")}

## Subject
- \`type: Subject\` format
- No more than ${SUBJECT_MAX} characters
- Begins with a capital letter
- Imperative mood ("Add", not "Added")
- No trailing period
- Blank line separates it from the body

## Body (optional)
- Only when the commit needs explanation
- Explains the **what** and **why**, not the how
- Wrap each line at ${BODY_WRAP} characters

## Footer (optional)
- References issue-tracker IDs: \`Resolves: #123\`, \`See also: #456, #789\`
`;

/** Greedy word-wrap that preserves existing paragraph breaks. */
function wrap(text: string, width: number): string {
  return text
    .split("\n")
    .map((para) => {
      const words = para.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        if (!line) line = w;
        else if ((line + " " + w).length <= width) line += " " + w;
        else {
          lines.push(line);
          line = w;
        }
      }
      if (line) lines.push(line);
      return lines.join("\n");
    })
    .join("\n");
}

interface Report {
  valid: boolean;
  problems: string[];
  warnings: string[];
}

function validate(message: string): Report {
  const problems: string[] = [];
  const warnings: string[] = [];
  const lines = message.replace(/\s+$/, "").split("\n");
  const subject = lines[0] ?? "";

  const m = subject.match(/^(\w+): (.*)$/);
  if (!m) {
    problems.push(`Subject must follow "type: Subject". Got: "${subject}".`);
  } else {
    const [, type, rest] = m;
    if (!TYPES[type]) {
      problems.push(`Unknown type "${type}". Use one of: ${Object.keys(TYPES).join(", ")}.`);
    }
    if (!rest) {
      problems.push("Subject text is empty after the type.");
    } else {
      if (!/^[A-Z]/.test(rest)) {
        problems.push(`Subject should begin with a capital letter (got "${rest[0]}").`);
      }
      const first = rest.split(/\s+/)[0];
      if (/(ed|ing)$/i.test(first)) {
        warnings.push(
          `"${first}" looks past-tense/gerund — use imperative mood ("Add", not "Added").`
        );
      }
    }
  }

  if (/\.$/.test(subject)) problems.push("Subject must not end with a period.");
  if (subject.length > SUBJECT_MAX) {
    problems.push(`Subject is ${subject.length} chars; max is ${SUBJECT_MAX}.`);
  }
  if (lines.length > 1 && lines[1].trim() !== "") {
    problems.push("Leave a blank line between the subject and the body.");
  }
  for (let i = 2; i < lines.length; i++) {
    if (lines[i].length > BODY_WRAP) {
      problems.push(`Line ${i + 1} is ${lines[i].length} chars; wrap body/footer at ${BODY_WRAP}.`);
    }
  }

  return { valid: problems.length === 0, problems, warnings };
}

const server = new McpServer({ name: "udacity-commit", version: "1.0.1" });

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
    description: "Check a commit message against the Udacity Git Commit Message Style Guide.",
    inputSchema: { message: z.string().describe("The full commit message to check") },
  },
  async ({ message }) => {
    const r = validate(message);
    const out = [
      r.valid ? "✅ Compliant with the Udacity style guide." : "❌ Not compliant.",
      ...r.problems.map((p) => `  • ${p}`),
      ...r.warnings.map((w) => `  ⚠ ${w}`),
    ].join("\n");
    return { content: [{ type: "text", text: out }] };
  }
);

server.registerTool(
  "format_commit_message",
  {
    title: "Format a Udacity-style commit message",
    description: "Compose a compliant commit message from its parts.",
    inputSchema: {
      type: z.enum(["feat", "fix", "docs", "style", "refactor", "test", "chore"]),
      subject: z
        .string()
        .describe("Imperative subject; auto-capitalized, trailing period removed"),
      body: z.string().optional().describe("What & why; auto-wrapped at 72 chars"),
      footer: z.string().optional().describe('Issue refs, e.g. "Resolves: #123"'),
    },
  },
  async ({ type, subject, body, footer }) => {
    let s = subject.trim().replace(/\.+$/, "");
    s = s.charAt(0).toUpperCase() + s.slice(1);
    const parts = [`${type}: ${s}`];
    if (body?.trim()) parts.push("", wrap(body.trim(), BODY_WRAP));
    if (footer?.trim()) parts.push("", footer.trim());
    const msg = parts.join("\n");
    const v = validate(msg);
    const note = v.valid ? "✅ compliant" : "❌ " + v.problems.join("; ");
    return { content: [{ type: "text", text: `${msg}\n\n--- ${note}` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
