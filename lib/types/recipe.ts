export interface Recipe {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  image_url: string | null;
  prep_time: number;
  cook_time: number;
  servings: number;
  calories_per_serving: number;
  protein_per_serving?: number;
  carbs_per_serving?: number;
  fat_per_serving?: number;
  is_public?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  created_at?: string;
  updated_at?: string;
}

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
}

export interface RecipeStep {
  id?: string;
  recipe_id?: string;
  step_number: number;
  instruction: string;
}

export interface RecipeCategory {
  id: string;
  name: string;
  type: 'meal_type' | 'cuisine' | 'diet' | 'method';
}

export interface RecipeFormData {
  title: string;
  description: string;
  image_url: string;
  prep_time: string;
  cook_time: string;
  servings: string;
  calories_per_serving: string;
  protein_per_serving: string;
  carbs_per_serving: string;
  fat_per_serving: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_public: boolean;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  categories: string[];
}

export const UNITS = [
  'cup',
  'tbsp',
  'tsp',
  'oz',
  'lb',
  'g',
  'kg',
  'ml',
  'L',
  'piece',
  'to taste',
] as const;

export const DIFFICULTY_LEVELS: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
