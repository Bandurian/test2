import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createClient } from '@/lib/supabase/client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Recipe, RecipeIngredient, RecipeStep } from '@/lib/types/recipe';

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const supabase = createClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (recipeError) throw recipeError;

      setRecipe(recipeData);
      setServings(recipeData.servings);
      setIsOwner(user?.id === recipeData.user_id);

      const { data: ingredientsData } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('created_at');

      setIngredients(ingredientsData || []);

      const { data: stepsData } = await supabase
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', id)
        .order('step_number');

      setSteps(stepsData || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load recipe');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const scaleIngredient = (quantity: number) => {
    if (!recipe) return quantity;
    return (quantity * servings) / recipe.servings;
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('recipes')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Success', 'Recipe deleted successfully');
              router.replace('/(tabs)/?tab=my');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete recipe');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    router.push(`/recipe/edit/${id}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        {isOwner && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleEdit} style={[styles.actionButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={[styles.actionButton, { backgroundColor: colors.error }]}>
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView>
        {recipe.image_url && (
          <Image source={{ uri: recipe.image_url }} style={styles.image} />
        )}

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>{recipe.description}</Text>

          <View style={styles.infoRow}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Prep Time</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{recipe.prep_time}m</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Cook Time</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{recipe.cook_time}m</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Servings</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{recipe.servings}</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.infoLabel, { color: colors.secondary }]}>Calories</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{recipe.calories_per_serving}</Text>
            </View>
          </View>

          {ingredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
                <View style={styles.servingsControl}>
                  <TouchableOpacity
                    onPress={() => setServings(Math.max(1, servings - 1))}
                    style={[styles.servingsButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.servingsButtonText, { color: colors.text }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.servingsText, { color: colors.text }]}>{servings} servings</Text>
                  <TouchableOpacity
                    onPress={() => setServings(servings + 1)}
                    style={[styles.servingsButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.servingsButtonText, { color: colors.text }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {ingredients.map((ingredient, index) => (
                <View key={index} style={[styles.ingredientItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.ingredientText, { color: colors.text }]}>
                    {scaleIngredient(ingredient.quantity).toFixed(1)} {ingredient.unit} {ingredient.ingredient_name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {steps.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
              {steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>{step.step_number}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>{step.instruction}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#e5e7eb',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servingsButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  servingsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ingredientText: {
    fontSize: 16,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 4,
  },
});
