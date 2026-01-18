-- Fix all missing RLS policies for recipe creation workflow

-- Drop and recreate RLS policies for recipe_ingredients
DROP POLICY IF EXISTS "Users can insert ingredients for their recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can update ingredients of their recipes" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete ingredients of their recipes" ON public.recipe_ingredients;

CREATE POLICY "Users can insert ingredients for their recipes" ON public.recipe_ingredients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update ingredients of their recipes" ON public.recipe_ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete ingredients of their recipes" ON public.recipe_ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

-- Drop and recreate RLS policies for recipe_steps
DROP POLICY IF EXISTS "Users can insert steps for their recipes" ON public.recipe_steps;
DROP POLICY IF EXISTS "Users can update steps of their recipes" ON public.recipe_steps;
DROP POLICY IF EXISTS "Users can delete steps of their recipes" ON public.recipe_steps;

CREATE POLICY "Users can insert steps for their recipes" ON public.recipe_steps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update steps of their recipes" ON public.recipe_steps FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete steps of their recipes" ON public.recipe_steps FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

-- Drop and recreate RLS policies for recipe_tags
DROP POLICY IF EXISTS "Users can insert tags for their recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can delete tags from their recipes" ON public.recipe_tags;

CREATE POLICY "Users can insert tags for their recipes" ON public.recipe_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete tags from their recipes" ON public.recipe_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
