/**
 * Pure, side-effect-free linting logic for the Udacity Git Commit Message
 * Style Guide. Kept separate from the MCP server (index.ts) so it can be
 * unit-tested in isolation.
 *
 * Length semantics: all limits are measured in Unicode code points
 * (`width()`), not UTF-16 code units, so emoji / CJK / combining marks are
 * counted the way a human reads them. The 50-char subject limit applies to
 * the WHOLE `type: Subject` line, including the `type: ` prefix.
 */

export const SUBJECT_MAX = 50;
export const BODY_WRAP = 72;

export const TYPES: Record<string, string> = {
  feat: "A new feature",
  fix: "A bug fix",
  docs: "Changes to documentation",
  style: "Formatting, missing semicolons, etc; no code change",
  refactor: "Refactoring production code",
  test: "Adding tests, refactoring tests; no production code change",
  chore: "Updating build tasks, package configs, etc; no production code change",
};

/** Footer keywords recognized for issue-reference validation. */
export const FOOTER_KEYS = ["Resolves", "Closes", "Fixes", "Fix", "See also", "Refs", "Ref"];

/**
 * Common non-imperative first words (past tense / gerund). We match against
 * this allow-known-bad list rather than a broad `/(ed|ing)$/` regex so that
 * legitimate imperatives like "Bring", "Embed", "Ring" are never flagged.
 * This favors precision (no false positives) over recall.
 */
const NON_IMPERATIVE = new Set<string>([
  // past tense
  "added", "fixed", "updated", "changed", "removed", "deleted", "created",
  "refactored", "implemented", "improved", "renamed", "moved", "merged",
  "reverted", "bumped", "cleaned", "corrected", "adjusted", "enabled",
  "disabled", "introduced", "resolved", "replaced", "converted", "migrated",
  "dropped", "extracted", "wrapped", "tweaked", "optimized", "simplified",
  "formatted", "documented", "tested", "released", "handled", "allowed",
  "prevented", "ensured", "avoided", "unified", "applied", "upgraded",
  "downgraded", "patched", "hardened", "restructured", "reorganized",
  "deprecated", "exposed", "integrated", "validated", "normalized", "cached",
  "supported", "added", "wired", "hooked",
  // gerund
  "adding", "fixing", "updating", "changing", "removing", "deleting",
  "creating", "refactoring", "implementing", "improving", "renaming",
  "moving", "merging", "reverting", "bumping", "cleaning", "correcting",
  "adjusting", "enabling", "disabling", "introducing", "resolving",
  "replacing", "converting", "migrating", "dropping", "extracting",
  "wrapping", "tweaking", "optimizing", "simplifying", "formatting",
  "documenting", "testing", "releasing", "handling", "allowing",
  "preventing", "ensuring", "avoiding", "unifying", "applying", "upgrading",
  "patching", "hardening", "restructuring", "reorganizing", "deprecating",
  "exposing", "integrating", "validating", "normalizing", "caching",
  "supporting",
]);

export const STYLE_GUIDE = `# Udacity Git Commit Message Style Guide

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
- The whole line (including the \`type: \` prefix) is no more than ${SUBJECT_MAX} characters
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

_Lengths are counted in Unicode code points._
`;

/** Length in Unicode code points (not UTF-16 code units). */
export function width(s: string): number {
  return [...s].length;
}

/** Uppercase the first code point of a string (astral-safe). */
function capitalizeFirst(s: string): string {
  const chars = [...s];
  if (chars.length === 0) return s;
  return chars[0].toUpperCase() + chars.slice(1).join("");
}

/**
 * Greedy word-wrap that preserves paragraph breaks AND hard-breaks any single
 * token longer than `max` (URLs, long paths), so no output line ever exceeds
 * the limit. This guarantees `format`'s output always passes `validate`.
 */
export function wrap(text: string, max: number = BODY_WRAP): string {
  return text
    .split("\n")
    .map((para) => {
      const lines: string[] = [];
      let line = "";
      const flush = () => {
        if (line) {
          lines.push(line);
          line = "";
        }
      };
      for (let word of para.split(/\s+/).filter(Boolean)) {
        // hard-break an over-long token across multiple lines
        while (width(word) > max) {
          flush();
          const chars = [...word];
          lines.push(chars.slice(0, max).join(""));
          word = chars.slice(max).join("");
        }
        if (!line) line = word;
        else if (width(line) + 1 + width(word) <= max) line += " " + word;
        else {
          flush();
          line = word;
        }
      }
      flush();
      return lines.join("\n");
    })
    .join("\n");
}

export interface Report {
  valid: boolean;
  problems: string[];
  warnings: string[];
}

/** Validate a full commit message against the Udacity style guide. */
export function validate(message: string): Report {
  const problems: string[] = [];
  const warnings: string[] = [];

  // Normalize CRLF / lone CR so line-based checks are reliable.
  const normalized = message.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  // Drop trailing blank lines (a trailing newline shouldn't count as a body).
  while (lines.length > 1 && lines[lines.length - 1].trim() === "") lines.pop();

  const rawSubject = lines[0] ?? "";
  const subject = rawSubject.replace(/\s+$/, "");

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
      if (/^\p{Ll}/u.test(rest)) {
        problems.push(`Subject should begin with a capital letter (got "${[...rest][0]}").`);
      }
      const firstWord = rest.split(/\s+/)[0];
      if (NON_IMPERATIVE.has(firstWord.toLowerCase())) {
        warnings.push(
          `"${firstWord}" looks past-tense/gerund — use the imperative mood ("Add", not "Added").`
        );
      }
    }
  }

  if (rawSubject !== subject) problems.push("Subject has trailing whitespace.");
  if (/\.$/.test(subject)) problems.push("Subject must not end with a period.");
  if (width(subject) > SUBJECT_MAX) {
    problems.push(
      `Subject line is ${width(subject)} chars (incl. the "type: " prefix); max is ${SUBJECT_MAX}.`
    );
  }

  if (lines.length > 1 && lines[1].trim() !== "") {
    problems.push("Leave a blank line between the subject and the body.");
  }

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (width(line) > BODY_WRAP) {
      problems.push(`Line ${i + 1} is ${width(line)} chars; wrap body/footer at ${BODY_WRAP}.`);
    }
    const fm = line.match(/^([A-Za-z][A-Za-z ]*?):\s*(.*)$/);
    if (fm && FOOTER_KEYS.some((k) => k.toLowerCase() === fm[1].toLowerCase())) {
      if (!/#\d+/.test(fm[2])) {
        warnings.push(`Footer "${fm[1]}" should reference an issue, e.g. "${fm[1]}: #123".`);
      }
    }
  }

  return { valid: problems.length === 0, problems, warnings };
}

export interface FormatInput {
  type: string;
  subject: string;
  body?: string;
  footer?: string;
}

/**
 * Compose a compliant commit message from parts. Capitalizes the subject,
 * strips a trailing period, and hard-wraps the body so the result always
 * passes `validate`.
 */
export function formatMessage(input: FormatInput): { message: string; report: Report } {
  const subject = capitalizeFirst(input.subject.trim().replace(/\.+$/, ""));
  const parts = [`${input.type}: ${subject}`];
  if (input.body?.trim()) parts.push("", wrap(input.body.trim(), BODY_WRAP));
  if (input.footer?.trim()) parts.push("", input.footer.trim());
  const message = parts.join("\n");
  return { message, report: validate(message) };
}
