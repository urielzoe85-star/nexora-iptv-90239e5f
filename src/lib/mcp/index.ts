import { defineMcp } from "@lovable.dev/mcp-js";
import pingTool from "./tools/ping";

export default defineMcp({
  name: "nexora-mcp",
  title: "Nexora IPTV MCP",
  version: "0.1.0",
  instructions: "Agent integrations for the Nexora IPTV app. Use `ping` to verify connectivity.",
  tools: [pingTool],
});