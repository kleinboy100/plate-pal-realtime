import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyOrders from "./tools/list_my_orders";
import getMyOrder from "./tools/get_my_order";
import listMenu from "./tools/list_menu";
import whoami from "./tools/whoami";

// Direct Supabase issuer is required for OAuth token verification.
// See ai-sdk-mcp-client / app-mcp-server-authoring knowledge.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nostys-mcp",
  title: "Nosty's Fresh Fast Food",
  version: "0.1.0",
  instructions:
    "Tools for Nosty's Fresh Fast Food customers. Use `whoami` to check the signed-in user, `list_menu` to browse Nosty's menu, `list_my_orders` for the user's recent orders, and `get_my_order` for full order details by order number.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listMenu, listMyOrders, getMyOrder],
});
