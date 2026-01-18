import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { createClient } from '@/lib/supabase/client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface Recipe {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  prep_time: number;
  cook_time: number;
  servings: number;
  calories_per_serving: number;
  user_id?: string;
  is_public?: boolean;
}

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    title: '',
    description: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    calories_per_serving: '',
  });
  const supabase = createClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: publicRecipes } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: userRecipes } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      setRecipes(publicRecipes || []);
      setMyRecipes(userRecipes || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipe = async () => {
    if (!newRecipe.title || !newRecipe.description) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('recipes').insert({
        ...newRecipe,
        prep_time: parseInt(newRecipe.prep_time) || 0,
        cook_time: parseInt(newRecipe.cook_time) || 0,
        servings: parseInt(newRecipe.servings) || 1,
        calories_per_serving: parseInt(newRecipe.calories_per_serving) || 0,
        user_id: user?.id,
        is_public: false,
      });

      if (error) throw error;

      Alert.alert('Success', 'Recipe added successfully');
      setShowAddModal(false);
      setNewRecipe({
        title: '',
        description: '',
        prep_time: '',
        cook_time: '',
        servings: '',
        calories_per_serving: '',
      });
      loadRecipes();
    } catch (error) {
      Alert.alert('Error', 'Failed to add recipe');
    }
  };

  const filteredRecipes = (activeTab === 'all' ? recipes : myRecipes).filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <View style={[styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {recipe.image_url && (
        <Image source={{ uri: recipe.image_url }} style={styles.recipeImage} />
      )}
      <View style={styles.recipeContent}>
        <Text style={[styles.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
        <Text style={[styles.recipeDescription, { color: colors.secondary }]} numberOfLines={2}>
          {recipe.description}
        </Text>
        <View style={styles.recipeInfo}>
          <Text style={[styles.recipeInfoText, { color: colors.icon }]}>
            ⏱️ {recipe.prep_time + recipe.cook_time}m
          </Text>
          <Text style={[styles.recipeInfoText, { color: colors.icon }]}>
            🍽️ {recipe.servings} servings
          </Text>
          <Text style={[styles.recipeInfoText, { color: colors.icon }]}>
            🔥 {recipe.calories_per_serving} cal
          </Text>
        </View>
      </View>
    </View>
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
      <View style={styles.header}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Search recipes..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'all' ? colors.primary : colors.secondary }]}>
            All Recipes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'my' ? colors.primary : colors.secondary }]}>
            My Recipes
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {filteredRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Recipe</Text>
            <ScrollView>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Title"
                placeholderTextColor={colors.icon}
                value={newRecipe.title}
                onChangeText={(text) => setNewRecipe({ ...newRecipe, title: text })}
              />
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Description"
                placeholderTextColor={colors.icon}
                value={newRecipe.description}
                onChangeText={(text) => setNewRecipe({ ...newRecipe, description: text })}
                multiline
                numberOfLines={4}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Prep time (min)"
                  placeholderTextColor={colors.icon}
                  value={newRecipe.prep_time}
                  onChangeText={(text) => setNewRecipe({ ...newRecipe, prep_time: text })}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.halfInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Cook time (min)"
                  placeholderTextColor={colors.icon}
                  value={newRecipe.cook_time}
                  onChangeText={(text) => setNewRecipe({ ...newRecipe, cook_time: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Servings"
                  placeholderTextColor={colors.icon}
                  value={newRecipe.servings}
                  onChangeText={(text) => setNewRecipe({ ...newRecipe, servings: text })}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.halfInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Calories"
                  placeholderTextColor={colors.icon}
                  value={newRecipe.calories_per_serving}
                  onChangeText={(text) => setNewRecipe({ ...newRecipe, calories_per_serving: text })}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddRecipe}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Add Recipe</Text>
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
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  addButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  recipeCard: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: 200,
  },
  recipeContent: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  recipeInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  recipeInfoText: {
    fontSize: 12,
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
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
