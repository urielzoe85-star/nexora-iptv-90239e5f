import { auth, defineMcp } from "@lovable.dev/mcp-js";
import pingTool from "./tools/ping";

// Direct Supabase issuer host (never the .lovable.cloud proxy) — required by
// RFC 8414 issuer matching in @lovable.dev/mcp-js. Vite inlines VITE_* at
// build time. The fallback keeps the string well-formed during the manifest
// extract eval; a real token never verifies against the sentinel.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nexora-mcp",
  title: "Nexora IPTV MCP",
  version: "0.1.0",
  instructions: "Agent integrations for the Nexora IPTV app. Use `ping` to verify connectivity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [pingTool],
});