# Weekly Manual Stock Recording Sheet (PDF)

Agent integrations (MCP) are already live on this app (server "Nosty's Fresh Fast Food" with `whoami`, `list_menu`, `list_my_orders`, `get_my_order`), so no work is needed there. This plan covers the new request: a printable weekly stock sheet.

## What you get

A downloadable A4 landscape PDF, one page per week, for writing stock counts by hand each day.

Layout per page:
- Header: Nosty's Fresh Fast Food, "Weekly Stock Record", blank lines for Week starting / Recorded by / Store.
- One row per ingredient (all 30 currently in the system: Atchar, Bacon, Boere Wors, Bread, Burger, Cheese, Cheesy Russian, Chicken Russian, Chicken Stripes, Chips, Club Stake, Curry Fish, Egg, Fish Fillet, Frankfurter, Ham, Lettuce, Liver, Magwenya, Mince, Nosty Sauce, Onion, Polony, Rib Burger, Russian, Secret Sauce, Special Garlic, Tomato, Unico Russian, Vienna).
- Columns: Ingredient | Unit | Opening | Mon | Tue | Wed | Thu | Fri | Sat | Sun | Closing | Notes — all daily cells blank for handwriting.
- Alternating row shading, red header band matching the brand, footer with page number and a signature line.
- A second page with blank ruled rows for ingredients not on the list (new stock items).

## How it's built

Generated once with Python + reportlab, ingredient names pulled from the `ingredient_stock` table, saved to `/mnt/documents/` as a PDF you can download and print each week. Each page is rendered to an image and visually checked for clipped columns or overflow before delivery.

No app code changes.

## Optional (say the word)

Add a "Download stock sheet" button in the dashboard Stock tab that generates the same sheet in-browser from the live ingredient list, so it always matches current ingredients.
