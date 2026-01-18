/*
  # Create MealHub Database Schema

  1. New Tables
    - `profiles` - User profile information and dietary preferences
    - `recipes` - Recipe details including title, description, cook times, and nutritional info
    - `recipe_ingredients` - Ingredients for each recipe with quantities and units
    - `recipe_steps` - Step-by-step cooking instructions
    - `meal_plans` - User meal plans with date ranges
    - `meal_plan_entries` - Individual meals within a meal plan
    - `shopping_lists` - Shopping lists for users and meal plans
    - `shopping_list_items` - Items in shopping lists
    - `favorites` - User favorite recipes

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public recipe viewing
*/

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  diet_type TEXT DEFAULT 'omnivore',
  allergies TEXT[] DEFAULT '{}',
  calorie_goal INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER DEFAULT 1,
  calories_per_serving INTEGER,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create recipe ingredients table
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create recipe steps table
CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create meal plans table
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create meal plan entries table
CREATE TABLE IF NOT EXISTS public.meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  servings INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create shopping list table
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create shopping list items table
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  is_purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Recipes RLS policies
CREATE POLICY "Users can view their own recipes" ON public.recipes FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_public = TRUE);
CREATE POLICY "Users can create recipes" ON public.recipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recipes" ON public.recipes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipes" ON public.recipes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recipe ingredients RLS policies
CREATE POLICY "Users can view ingredients of accessible recipes" ON public.recipe_ingredients FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND (user_id = auth.uid() OR is_public = TRUE))
);

-- Recipe steps RLS policies
CREATE POLICY "Users can view steps of accessible recipes" ON public.recipe_steps FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND (user_id = auth.uid() OR is_public = TRUE))
);

-- Meal plans RLS policies
CREATE POLICY "Users can view their own meal plans" ON public.meal_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create meal plans" ON public.meal_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meal plans" ON public.meal_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meal plans" ON public.meal_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Meal plan entries RLS policies
CREATE POLICY "Users can view entries of their meal plans" ON public.meal_plan_entries FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create entries in their meal plans" ON public.meal_plan_entries FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update entries in their meal plans" ON public.meal_plan_entries FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
);

-- Shopping lists RLS policies
CREATE POLICY "Users can view their own shopping lists" ON public.shopping_lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create shopping lists" ON public.shopping_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shopping lists" ON public.shopping_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Shopping list items RLS policies
CREATE POLICY "Users can view items in their shopping lists" ON public.shopping_list_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.shopping_lists WHERE id = shopping_list_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create items in their shopping lists" ON public.shopping_list_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.shopping_lists WHERE id = shopping_list_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update items in their shopping lists" ON public.shopping_list_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.shopping_lists WHERE id = shopping_list_id AND user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.shopping_lists WHERE id = shopping_list_id AND user_id = auth.uid())
);

-- Favorites RLS policies
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create favorites" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);