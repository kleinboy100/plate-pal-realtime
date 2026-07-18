import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_menu",
  title: "List Nosty's menu",
  description:
    "List Nosty's Fresh Fast Food menu items (name, category, price, availability). Optional category filter.",
  inputSchema: {
    category: z.string().trim().min(1).optional().describe("Optional category name to filter by."),
    only_available: z.boolean().default(true).describe("If true, hide unavailable items."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, only_available }, ctx) => {
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("menu_items")
      .select("id, name, description, category, price, is_available, image_url")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (category) q = q.ilike("category", `%${category}%`);
    if (only_available ?? true) q = q.eq("is_available", true);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
