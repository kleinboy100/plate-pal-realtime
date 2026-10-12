import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const RESTAURANT_ID = '7f5250bb-263f-4bca-a4af-d325f761542b'
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') return json({ error: 'Use GET' }, 405)

  const expected = Deno.env.get('N8N_API_KEY')
  if (!expected) return json({ error: 'API key not configured' }, 500)
  const auth = req.headers.get('Authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : (req.headers.get('x-api-key') ?? '')
  if (!provided || !safeEqual(provided, expected)) return json({ error: 'Unauthorized' }, 401)

  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? 'all'
  if (!['all', 'sales', 'stock', 'recipes'].includes(type)) return json({ error: 'type must be all, sales, stock or recipes' }, 400)
  const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'date must be YYYY-MM-DD' }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const out: Record<string, unknown> = { date, currency: 'ZAR' }

  if (type === 'all' || type === 'sales') {
    // Johannesburg day (UTC+2)
    const start = new Date(`${date}T00:00:00+02:00`).toISOString()
    const end = new Date(new Date(`${date}T00:00:00+02:00`).getTime() + 86400000).toISOString()
    const { data, error } = await db
      .from('orders')
      .select('order_number, status, order_type, payment_method, payment_confirmed, total_amount, delivery_fee, tip_amount, created_at, delivered_at, order_items(item_name, quantity, price)')
      .eq('restaurant_id', RESTAURANT_ID)
      .gte('created_at', start).lt('created_at', end)
      .order('created_at')
    if (error) return json({ error: error.message }, 500)
    const valid = (data ?? []).filter((o) => o.status !== 'cancelled')
    const items: Record<string, { quantity: number; revenue: number }> = {}
    for (const o of valid) for (const i of o.order_items ?? []) {
      const k = (items[i.item_name] ??= { quantity: 0, revenue: 0 })
      k.quantity += i.quantity; k.revenue += Number(i.price) * i.quantity
    }
    out.sales = {
      order_count: valid.length,
      total_revenue: valid.reduce((s, o) => s + Number(o.total_amount), 0),
      delivery_fees: valid.reduce((s, o) => s + Number(o.delivery_fee), 0),
      items_sold: Object.entries(items).map(([item_name, v]) => ({ item_name, ...v })),
      orders: data,
    }
  }
  if (type === 'all' || type === 'stock') {
    const { data, error } = await db.from('ingredient_stock')
      .select('ingredient_name, current_stock, unit, min_stock_level, max_stock_level, last_updated')
      .eq('restaurant_id', RESTAURANT_ID).order('ingredient_name')
    if (error) return json({ error: error.message }, 500)
    out.stock = (data ?? []).map((s) => ({ ...s, below_minimum: Number(s.current_stock) < Number(s.min_stock_level ?? 0) }))
  }
  if (type === 'all' || type === 'recipes') {
    const { data, error } = await db.from('meal_recipes')
      .select('meal_name, ingredient_name, quantity_per_meal, unit').order('meal_name')
    if (error) return json({ error: error.message }, 500)
    out.recipes = data
  }
  return json(out)
})
