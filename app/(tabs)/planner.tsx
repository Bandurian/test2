import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { createClient } from '@/lib/supabase/client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface MealEntry {
  id: string;
  meal_type: string;
  recipe_id: string | null;
  servings: number;
  meal_date: string;
  recipes?: { title: string };
}

interface Recipe {
  id: string;
  title: string;
}

const mealTypes = [
  { type: 'breakfast', emoji: '🌅', title: 'Breakfast' },
  { type: 'lunch', emoji: '🍽️', title: 'Lunch' },
  { type: 'dinner', emoji: '🌙', title: 'Dinner' },
  { type: 'snack', emoji: '🥜', title: 'Snack' },
];

export default function PlannerScreen() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [servings, setServings] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let mealPlanId = await getOrCreateTodayMealPlan(user?.id);

      const { data: mealEntries } = await supabase
        .from('meal_plan_entries')
        .select('*, recipes(title)')
        .eq('meal_plan_id', mealPlanId)
        .eq('meal_date', today);

      const { data: recipesList } = await supabase
        .from('recipes')
        .select('id, title')
        .or(`user_id.eq.${user?.id},is_public.eq.true`)
        .order('title');

      setMeals(mealEntries || []);
      setRecipes(recipesList || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateTodayMealPlan = async (userId: string | undefined) => {
    if (!userId) return null;

    const { data: existingPlan } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('user_id', userId)
      .lte('start_date', today)
      .gte('end_date', today)
      .maybeSingle();

    if (existingPlan) {
      return existingPlan.id;
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const { data: newPlan } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        name: `Meal Plan ${new Date().toLocaleDateString()}`,
        start_date: today,
        end_date: endDate.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    return newPlan?.id;
  };

  const handleAddMeal = async () => {
    if (!selectedRecipeId) {
      Alert.alert('Error', 'Please select a recipe');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const mealPlanId = await getOrCreateTodayMealPlan(user?.id);

      const { error } = await supabase.from('meal_plan_entries').insert({
        meal_plan_id: mealPlanId,
        recipe_id: selectedRecipeId,
        meal_type: selectedMealType,
        meal_date: today,
        servings: parseInt(servings) || 1,
      });

      if (error) throw error;

      setShowDialog(false);
      setSelectedRecipeId('');
      setServings('1');
      setSearchQuery('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add meal');
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      const { error } = await supabase.from('meal_plan_entries').delete().eq('id', id);

      if (error) throw error;

      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete meal');
    }
  };

  const getMealsByType = (type: string) => {
    return meals.filter((meal) => meal.meal_type === type);
  };

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <Text style={[styles.dateText, { color: colors.text }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {mealTypes.map((mealType) => {
          const mealEntries = getMealsByType(mealType.type);

          return (
            <View key={mealType.type} style={[styles.mealSection, { backgroundColor: colors.card }]}>
              <View style={styles.mealHeader}>
                <Text style={[styles.mealTitle, { color: colors.text }]}>
                  {mealType.emoji} {mealType.title}
                </Text>
                <TouchableOpacity
                  style={[styles.addMealButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setSelectedMealType(mealType.type);
                    setShowDialog(true);
                  }}
                >
                  <Text style={styles.addMealButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              {mealEntries.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.secondary }]}>No meal planned</Text>
              ) : (
                mealEntries.map((meal) => (
                  <View key={meal.id} style={[styles.mealItem, { borderColor: colors.border }]}>
                    <View style={styles.mealItemContent}>
                      <Text style={[styles.mealItemTitle, { color: colors.text }]}>
                        {meal.recipes?.title || 'Unknown Recipe'}
                      </Text>
                      <Text style={[styles.mealItemServings, { color: colors.secondary }]}>
                        {meal.servings} serving{meal.servings > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteMeal(meal.id)}>
                      <Text style={[styles.deleteButton, { color: colors.error }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={showDialog} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Meal</Text>

            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Search recipes..."
              placeholderTextColor={colors.icon}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={styles.recipeList}>
              {filteredRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={[
                    styles.recipeItem,
                    selectedRecipeId === recipe.id && { backgroundColor: colors.primary + '20' },
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedRecipeId(recipe.id)}
                >
                  <Text style={[styles.recipeItemText, { color: colors.text }]}>{recipe.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Servings"
              placeholderTextColor={colors.icon}
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowDialog(false);
                  setSelectedRecipeId('');
                  setServings('1');
                  setSearchQuery('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddMeal}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  mealSection: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addMealButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMealButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    marginTop: 8,
  },
  mealItemContent: {
    flex: 1,
  },
  mealItemTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  mealItemServings: {
    fontSize: 14,
  },
  deleteButton: {
    fontSize: 24,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  recipeList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  recipeItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  recipeItemText: {
    fontSize: 16,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
  },
});
