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
  name: "get_my_order",
  title: "Get one of my orders",
  description:
    "Get full details (items + totals) for one of the signed-in user's orders, by order number.",
  inputSchema: {
    order_number: z.number().int().positive().describe("The Nosty's order number, e.g. 1234."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_number }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, order_type, total_amount, delivery_fee, tip_amount, payment_method, payment_confirmed, delivery_address, notes, created_at, delivered_at",
      )
      .eq("user_id", ctx.getUserId())
      .eq("order_number", order_number)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!order) return { content: [{ type: "text", text: "Order not found" }], isError: true };

    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("item_name, quantity, price")
      .eq("order_id", order.id);
    if (itemsErr) return { content: [{ type: "text", text: itemsErr.message }], isError: true };

    const payload = { ...order, items: items ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
