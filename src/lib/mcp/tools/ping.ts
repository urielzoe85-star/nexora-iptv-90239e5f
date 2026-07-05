import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "ping",
  title: "Ping",
  description: "Health check tool that returns 'pong' to verify the MCP server is reachable.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({ content: [{ type: "text", text: "pong" }] }),
});