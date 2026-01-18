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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  const supabase = createClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

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

  const filteredRecipes = (activeTab === 'all' ? recipes : myRecipes).filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <TouchableOpacity
      style={[styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
    >
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
    </TouchableOpacity>
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
          onPress={() => router.push('/recipe/create')}
        >
          <Text style={styles.addButtonText}>+ New</Text>
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
        {filteredRecipes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.secondary }]}>No recipes found</Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/recipe/create')}
            >
              <Text style={styles.emptyButtonText}>Create Your First Recipe</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))
        )}
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
