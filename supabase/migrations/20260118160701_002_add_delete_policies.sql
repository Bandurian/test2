/*
  # Add missing DELETE policies

  1. Changes
    - Add DELETE policy for meal_plan_entries
    - Add DELETE policy for shopping_list_items
*/

-- Add missing DELETE policy for meal_plan_entries
CREATE POLICY "Users can delete entries from their meal plans" 
  ON public.meal_plan_entries 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
  );

-- Add missing DELETE policy for shopping_list_items
CREATE POLICY "Users can delete items from their shopping lists" 
  ON public.shopping_list_items 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.shopping_lists WHERE id = shopping_list_id AND user_id = auth.uid())
  );