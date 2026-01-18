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
  recipes?: { title: string; calories_per_serving: number };
}

interface Recipe {
  id: string;
  title: string;
  calories_per_serving: number;
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
  const [view, setView] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekMeals, setWeekMeals] = useState<{[key: string]: MealEntry[]}>({});

  const supabase = createClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (view === 'day') {
      loadData();
    } else {
      loadWeekData();
    }
  }, [view, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = selectedDate.toISOString().split('T')[0];
      let mealPlanId = await getOrCreateMealPlan(user?.id, today);

      const { data: mealEntries } = await supabase
        .from('meal_plan_entries')
        .select('*, recipes(title, calories_per_serving)')
        .eq('meal_plan_id', mealPlanId)
        .eq('meal_date', today);

      const { data: recipesList } = await supabase
        .from('recipes')
        .select('id, title, calories_per_serving')
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

  const loadWeekData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const weekDates = getWeekDates(selectedDate);
      const weekMealsData: {[key: string]: MealEntry[]} = {};

      for (const date of weekDates) {
        const dateStr = date.toISOString().split('T')[0];
        const mealPlanId = await getOrCreateMealPlan(user?.id, dateStr);

        const { data: mealEntries } = await supabase
          .from('meal_plan_entries')
          .select('*, recipes(title, calories_per_serving)')
          .eq('meal_plan_id', mealPlanId)
          .eq('meal_date', dateStr);

        weekMealsData[dateStr] = mealEntries || [];
      }

      setWeekMeals(weekMealsData);

      const { data: recipesList } = await supabase
        .from('recipes')
        .select('id, title, calories_per_serving')
        .or(`user_id.eq.${user?.id},is_public.eq.true`)
        .order('title');

      setRecipes(recipesList || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load week data');
    } finally {
      setLoading(false);
    }
  };

  const getWeekDates = (date: Date) => {
    const dates = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      dates.push(weekDate);
    }
    return dates;
  };

  const getOrCreateMealPlan = async (userId: string | undefined, date: string) => {
    if (!userId) return null;

    const { data: existingPlan } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('user_id', userId)
      .lte('start_date', date)
      .gte('end_date', date)
      .maybeSingle();

    if (existingPlan) return existingPlan.id;

    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 7);

    const { data: newPlan } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        name: `Meal Plan ${new Date(date).toLocaleDateString()}`,
        start_date: date,
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
      const dateStr = selectedDate.toISOString().split('T')[0];
      const mealPlanId = await getOrCreateMealPlan(user?.id, dateStr);

      const { error } = await supabase.from('meal_plan_entries').insert({
        meal_plan_id: mealPlanId,
        recipe_id: selectedRecipeId,
        meal_type: selectedMealType,
        meal_date: dateStr,
        servings: parseInt(servings) || 1,
      });

      if (error) throw error;

      setShowDialog(false);
      setSelectedRecipeId('');
      setServings('1');
      setSearchQuery('');
      view === 'day' ? loadData() : loadWeekData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add meal');
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      const { error } = await supabase.from('meal_plan_entries').delete().eq('id', id);
      if (error) throw error;
      view === 'day' ? loadData() : loadWeekData();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete meal');
    }
  };

  const getMealsByType = (type: string, date?: string) => {
    if (view === 'week' && date) {
      return (weekMeals[date] || []).filter((meal) => meal.meal_type === type);
    }
    return meals.filter((meal) => meal.meal_type === type);
  };

  const getDayCalories = (date: string) => {
    const dayMeals = weekMeals[date] || [];
    return dayMeals.reduce((total, meal) => {
      return total + (meal.recipes?.calories_per_serving || 0) * meal.servings;
    }, 0);
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
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewButton, view === 'day' && { backgroundColor: colors.primary }]}
          onPress={() => setView('day')}
        >
          <Text style={[styles.viewButtonText, view === 'day' && { color: '#fff' }, { color: colors.text }]}>
            Day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, view === 'week' && { backgroundColor: colors.primary }]}
          onPress={() => setView('week')}
        >
          <Text style={[styles.viewButtonText, view === 'week' && { color: '#fff' }, { color: colors.text }]}>
            Week
          </Text>
        </TouchableOpacity>
      </View>

      {view === 'day' ? (
        <ScrollView style={styles.scrollView}>
          <Text style={[styles.dateText, { color: colors.text }]}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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
                          {meal.servings} serving{meal.servings > 1 ? 's' : ''} • {(meal.recipes?.calories_per_serving || 0) * meal.servings} cal
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
      ) : (
        <ScrollView style={styles.scrollView}>
          {getWeekDates(selectedDate).map((date) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayCalories = getDayCalories(dateStr);

            return (
              <View key={dateStr} style={[styles.weekDayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.weekDayHeader}>
                  <Text style={[styles.weekDayTitle, { color: colors.text }]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={[styles.weekDayCalories, { color: colors.primary }]}>
                    {dayCalories} cal
                  </Text>
                </View>

                <View style={styles.weekMealsGrid}>
                  {mealTypes.map((mealType) => {
                    const mealEntries = getMealsByType(mealType.type, dateStr);
                    return (
                      <View key={mealType.type} style={styles.weekMealSlot}>
                        <Text style={[styles.weekMealType, { color: colors.secondary }]}>
                          {mealType.emoji}
                        </Text>
                        {mealEntries.length > 0 ? (
                          <Text style={[styles.weekMealCount, { color: colors.text }]} numberOfLines={1}>
                            {mealEntries.length}
                          </Text>
                        ) : (
                          <Text style={[styles.weekMealEmpty, { color: colors.icon }]}>-</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

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
  viewToggle: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  weekDayCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekDayTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekDayCalories: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekMealsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  weekMealSlot: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  weekMealType: {
    fontSize: 20,
    marginBottom: 4,
  },
  weekMealCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekMealEmpty: {
    fontSize: 14,
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
