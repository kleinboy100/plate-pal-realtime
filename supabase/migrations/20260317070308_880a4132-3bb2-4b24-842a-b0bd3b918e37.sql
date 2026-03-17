CREATE OR REPLACE FUNCTION public.deduct_ingredients_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_recipe RECORD;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    FOR v_item IN
      SELECT oi.item_name, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      FOR v_recipe IN
        SELECT mr.ingredient_name, mr.quantity_per_meal, mr.unit
        FROM meal_recipes mr
        WHERE mr.meal_name = v_item.item_name
      LOOP
        UPDATE ingredient_stock
        SET current_stock = GREATEST(0, current_stock - (v_recipe.quantity_per_meal * v_item.quantity)),
            last_updated = CURRENT_TIMESTAMP
        WHERE ingredient_name = v_recipe.ingredient_name
          AND restaurant_id = NEW.restaurant_id;

        UPDATE stock
        SET current_stock = GREATEST(0, current_stock - (v_recipe.quantity_per_meal * v_item.quantity)::integer),
            last_updated = now()
        WHERE item_name = v_recipe.ingredient_name
          AND restaurant_id = NEW.restaurant_id;

        INSERT INTO stock_transactions (restaurant_id, item_name, quantity, previous_stock, new_stock, transaction_type, notes)
        SELECT 
          NEW.restaurant_id,
          v_recipe.ingredient_name,
          (v_recipe.quantity_per_meal * v_item.quantity)::integer,
          s.current_stock + (v_recipe.quantity_per_meal * v_item.quantity)::integer,
          s.current_stock,
          'SALE',
          'Auto-deducted for order ' || NEW.id::text || ' - ' || v_item.item_name
        FROM stock s
        WHERE s.item_name = v_recipe.ingredient_name
          AND s.restaurant_id = NEW.restaurant_id;
      END LOOP;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;