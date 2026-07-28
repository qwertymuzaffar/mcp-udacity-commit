// Minimal end-to-end check: spawn the built stdio server and exercise it.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["build/index.js"],
});
const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log("TOOLS:", tools.map((t) => t.name).join(", "));

const { resources } = await client.listResources();
console.log("RESOURCES:", resources.map((r) => r.uri).join(", "));

const bad = await client.callTool({
  name: "validate_commit_message",
  arguments: { message: "Fixed the login bug." },
});
console.log("\n[validate — intentionally bad message]");
console.log(bad.content[0].text);

const formatted = await client.callTool({
  name: "format_commit_message",
  arguments: {
    type: "fix",
    subject: "prevent duplicate auth token refresh.",
    body: "The refresh timer could fire twice under load, minting two tokens and logging the user out. Serialize refreshes behind a single in-flight promise so concurrent callers await the same request.",
    footer: "Resolves: #142",
  },
});
console.log("\n[format — from parts]");
console.log(formatted.content[0].text);

await client.close();
console.log("\n✅ end-to-end check passed");
