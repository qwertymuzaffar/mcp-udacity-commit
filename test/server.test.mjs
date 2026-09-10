// The stdio server must report the version that package.json publishes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const serverJson = JSON.parse(readFileSync(new URL("../server.json", import.meta.url), "utf8"));

test("the server reports the package.json version over stdio", async () => {
  const client = new Client({ name: "version-test", version: "0.0.0" });
  await client.connect(new StdioClientTransport({ command: "node", args: ["build/index.js"] }));
  try {
    assert.equal(client.getServerVersion()?.version, packageJson.version);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name), ["validate_commit_message", "format_commit_message", "validate_branch_name"]);
  } finally {
    await client.close();
  }
});

test("server.json carries the package.json version", () => {
  assert.equal(serverJson.version, packageJson.version);
  for (const entry of serverJson.packages) assert.equal(entry.version, packageJson.version);
});
