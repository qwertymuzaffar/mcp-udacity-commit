// Unit tests for the linting core. Run with `npm test` (builds first, then
// `node --test`). Tests import the COMPILED module so they exercise the
// artifact that actually ships.
import test from "node:test";
import assert from "node:assert/strict";

import {
  validate,
  formatMessage,
  validateBranch,
  wrap,
  width,
  SUBJECT_MAX,
  BODY_WRAP,
  BRANCH_MAX,
} from "../build/lint.js";

test("a well-formed message is compliant", () => {
  const r = validate("feat: Add dark mode toggle");
  assert.equal(r.valid, true);
  assert.deepEqual(r.problems, []);
});

test("CRLF line endings do not break validation (bug #1)", () => {
  const r = validate("feat: Add feature\r\n\r\nBody explains why.");
  assert.equal(r.valid, true, r.problems.join("; "));
});

test("imperative hint: flags common past tense but not real imperatives (bug #2)", () => {
  assert.equal(validate("feat: Added dark mode").warnings.length, 1);
  assert.equal(validate("feat: Fixing the crash").warnings.length, 1);
  // legitimate imperatives ending in ed/ing must NOT warn
  assert.equal(validate("feat: Bring back dark mode").warnings.length, 0);
  assert.equal(validate("feat: Embed the video player").warnings.length, 0);
  assert.equal(validate("feat: Add dark mode").warnings.length, 0);
});

test("imperative violation is a warning, not a hard failure", () => {
  const r = validate("feat: Added dark mode");
  assert.equal(r.valid, true);
  assert.equal(r.warnings.length, 1);
});

test("format hard-breaks over-long tokens so its output always validates (bug #3)", () => {
  const token = "x".repeat(100);
  const { message, report } = formatMessage({ type: "fix", subject: "handle long url", body: token });
  assert.equal(report.valid, true, report.problems.join("; "));
  for (const line of message.split("\n")) {
    assert.ok(width(line) <= BODY_WRAP, `line too long: ${line}`);
  }
});

test("footer keyword without an issue ref warns (bug #4)", () => {
  assert.equal(validate("feat: Add x\n\nResolves: #123").warnings.length, 0);
  const r = validate("feat: Add x\n\nResolves: the bug");
  assert.ok(r.warnings.some((w) => /Footer/.test(w)));
});

test("length is counted in code points, not UTF-16 units (bug #6)", () => {
  // 6 + 23 = 29 code points (≤50) but 52 UTF-16 units (would fail with .length)
  const subject = "feat: " + "😀".repeat(23);
  assert.equal(width(subject), 29);
  assert.equal(validate(subject).valid, true);
});

test("50-char limit applies to the whole line incl. the type prefix (bug #7)", () => {
  assert.equal(validate("feat: " + "A".repeat(44)).valid, true); // total 50
  const over = validate("feat: " + "A".repeat(45)); // total 51
  assert.equal(over.valid, false);
  assert.ok(over.problems.some((p) => /max is 50/.test(p)));
});

test("trailing whitespace on the subject is flagged when a body follows", () => {
  const r = validate("feat: Add feature   \n\nBody");
  assert.ok(r.problems.some((p) => /trailing whitespace/.test(p)));
});

test("structural violations: missing/unknown/uppercase type", () => {
  assert.equal(validate("no colon here").valid, false);
  assert.ok(validate("wip: Do stuff").problems.some((p) => /Unknown type/.test(p)));
  assert.ok(validate("Feat: Do stuff").problems.some((p) => /Unknown type/.test(p)));
});

test("subject rules: capital start and no trailing period", () => {
  assert.ok(validate("feat: add lowercase").problems.some((p) => /capital letter/.test(p)));
  assert.ok(validate("feat: Add trailing period.").problems.some((p) => /period/.test(p)));
});

test("format capitalizes the subject and strips a trailing period", () => {
  const { message } = formatMessage({ type: "fix", subject: "prevent duplicate refresh.", footer: "Resolves: #142" });
  assert.match(message, /^fix: Prevent duplicate refresh\n/);
  assert.match(message, /\nResolves: #142$/);
});

test("wrap respects the width and preserves paragraph breaks", () => {
  const wrapped = wrap("one two three four five six seven eight nine ten eleven twelve", 20);
  for (const line of wrapped.split("\n")) assert.ok(width(line) <= 20);
});

test("exported limits match the guide", () => {
  assert.equal(SUBJECT_MAX, 50);
  assert.equal(BODY_WRAP, 72);
  assert.equal(BRANCH_MAX, 50);
});

test("branch: a well-formed type/kebab-case name is compliant", () => {
  for (const name of ["feat/add-dark-mode", "fix/duplicate-auth-refresh", "chore/bump-deps", "test/cover-edge-case-42"]) {
    const r = validateBranch(name);
    assert.equal(r.valid, true, `${name}: ${r.problems.join("; ")}`);
    assert.deepEqual(r.problems, []);
  }
});

test("branch: missing type/ prefix fails", () => {
  const r = validateBranch("add-dark-mode");
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => /type\/description/.test(p)));
});

test("branch: unknown type fails with the allowed list", () => {
  const r = validateBranch("wip/do-stuff");
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => /Unknown type/.test(p)));
});

test("branch: non-kebab descriptions are flagged with a specific reason", () => {
  assert.ok(validateBranch("feat/Add-Dark-Mode").problems.some((p) => /lowercase kebab-case/.test(p)));
  assert.ok(validateBranch("feat/add_dark_mode").problems.some((p) => /hyphens, not spaces or underscores/.test(p)));
  assert.ok(validateBranch("feat/add dark mode").problems.some((p) => /hyphens, not spaces or underscores/.test(p)));
  // leading / trailing / double hyphens fall back to the general kebab message
  assert.ok(validateBranch("feat/-lead").problems.some((p) => /kebab-case/.test(p)));
  assert.ok(validateBranch("feat/trail-").problems.some((p) => /kebab-case/.test(p)));
  assert.ok(validateBranch("feat/double--hyphen").problems.some((p) => /kebab-case/.test(p)));
});

test("branch: extra slashes in the description are rejected", () => {
  const r = validateBranch("feat/add/dark-mode");
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => /single "\/"/.test(p)));
});

test("branch: empty description after the type fails", () => {
  const r = validateBranch("feat/");
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => /Description after the type is empty/.test(p)));
});

test("branch: base branches are exempt (valid with a note)", () => {
  for (const name of ["main", "master", "dev", "develop", "trunk", "release/1.2.0"]) {
    const r = validateBranch(name);
    assert.equal(r.valid, true, `${name}: ${r.problems.join("; ")}`);
    assert.ok(r.warnings.some((w) => /base branch/.test(w)));
  }
});

test("branch: over-length name is a warning, not a failure", () => {
  const name = "feat/" + "a".repeat(BRANCH_MAX); // well over the limit
  const r = validateBranch(name);
  assert.equal(r.valid, true);
  assert.ok(r.warnings.some((w) => /keep it 50 or fewer/.test(w)));
});

test("branch: leading/trailing whitespace is flagged", () => {
  const r = validateBranch(" feat/add-dark-mode");
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => /whitespace/.test(p)));
});

test("branch: empty input fails cleanly", () => {
  const r = validateBranch("   ");
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => /empty/.test(p)));
});
