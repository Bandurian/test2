-- Add missing DELETE policy for meal_plan_entries
-- This policy allows users to delete entries from their own meal plans

CREATE POLICY "Users can delete entries from their meal plans" ON public.meal_plan_entries FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
);
