import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createClient } from '@/lib/supabase/client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { RecipeFormData, RecipeIngredient, RecipeStep, UNITS, DIFFICULTY_LEVELS } from '@/lib/types/recipe';

export default function CreateRecipeScreen() {
  const router = useRouter();
  const supabase = createClient();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RecipeFormData>({
    title: '',
    description: '',
    image_url: '',
    prep_time: '',
    cook_time: '',
    servings: '4',
    calories_per_serving: '',
    protein_per_serving: '',
    carbs_per_serving: '',
    fat_per_serving: '',
    difficulty: 'medium',
    is_public: false,
    ingredients: [{ ingredient_name: '', quantity: 0, unit: 'cup' }],
    steps: [{ step_number: 1, instruction: '' }],
    categories: [],
  });

  const updateFormData = (field: keyof RecipeFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_name: '', quantity: 0, unit: 'cup' }],
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, { step_number: prev.steps.length + 1, instruction: '' }],
    }));
  };

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index).map((step, i) => ({ ...step, step_number: i + 1 })),
    }));
  };

  const updateStep = (index: number, instruction: string) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? { ...step, instruction } : step)),
    }));
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.title.trim()) {
        Alert.alert('Error', 'Please enter a recipe title');
        return false;
      }
      if (!formData.description.trim()) {
        Alert.alert('Error', 'Please enter a description');
        return false;
      }
    } else if (currentStep === 2) {
      const validIngredients = formData.ingredients.filter((ing) => ing.ingredient_name.trim());
      if (validIngredients.length === 0) {
        Alert.alert('Error', 'Please add at least one ingredient');
        return false;
      }
    } else if (currentStep === 3) {
      const validSteps = formData.steps.filter((step) => step.instruction.trim());
      if (validSteps.length === 0) {
        Alert.alert('Error', 'Please add at least one instruction step');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const previousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const recipeData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url || null,
        prep_time: parseInt(formData.prep_time) || 0,
        cook_time: parseInt(formData.cook_time) || 0,
        servings: parseInt(formData.servings) || 1,
        calories_per_serving: parseInt(formData.calories_per_serving) || 0,
        is_public: formData.is_public,
      };

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert(recipeData)
        .select()
        .single();

      if (recipeError) throw recipeError;

      const validIngredients = formData.ingredients
        .filter((ing) => ing.ingredient_name.trim())
        .map((ing) => ({
          recipe_id: recipe.id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity || 0,
          unit: ing.unit,
        }));

      if (validIngredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(validIngredients);

        if (ingredientsError) throw ingredientsError;
      }

      const validSteps = formData.steps
        .filter((step) => step.instruction.trim())
        .map((step) => ({
          recipe_id: recipe.id,
          step_number: step.step_number,
          instruction: step.instruction,
        }));

      if (validSteps.length > 0) {
        const { error: stepsError } = await supabase
          .from('recipe_steps')
          .insert(validSteps);

        if (stepsError) throw stepsError;
      }

      Alert.alert('Success', 'Recipe created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ScrollView style={styles.stepContent}>
            <Text style={[styles.label, { color: colors.secondary }]}>Recipe Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.title}
              onChangeText={(text) => updateFormData('title', text)}
              placeholder="Enter recipe title"
              placeholderTextColor={colors.icon}
            />

            <Text style={[styles.label, { color: colors.secondary }]}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              placeholder="Describe your recipe"
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.label, { color: colors.secondary }]}>Image URL (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.image_url}
              onChangeText={(text) => updateFormData('image_url', text)}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.icon}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={[styles.label, { color: colors.secondary }]}>Prep Time (min)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.prep_time}
                  onChangeText={(text) => updateFormData('prep_time', text)}
                  placeholder="15"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.label, { color: colors.secondary }]}>Cook Time (min)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.cook_time}
                  onChangeText={(text) => updateFormData('cook_time', text)}
                  placeholder="30"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={[styles.label, { color: colors.secondary }]}>Servings</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.servings}
                  onChangeText={(text) => updateFormData('servings', text)}
                  placeholder="4"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.label, { color: colors.secondary }]}>Calories/Serving</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.calories_per_serving}
                  onChangeText={(text) => updateFormData('calories_per_serving', text)}
                  placeholder="350"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => updateFormData('is_public', !formData.is_public)}
              >
                <View style={[styles.checkboxBox, { borderColor: colors.border }]}>
                  {formData.is_public && <View style={[styles.checkboxChecked, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Make this recipe public</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 2:
        return (
          <ScrollView style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
            {formData.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientRow}>
                <TextInput
                  style={[styles.input, styles.ingredientName, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={ingredient.ingredient_name}
                  onChangeText={(text) => updateIngredient(index, 'ingredient_name', text)}
                  placeholder="Ingredient name"
                  placeholderTextColor={colors.icon}
                />
                <TextInput
                  style={[styles.input, styles.ingredientQty, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={ingredient.quantity.toString()}
                  onChangeText={(text) => updateIngredient(index, 'quantity', parseFloat(text) || 0)}
                  placeholder="1"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.ingredientUnit, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={ingredient.unit}
                  onChangeText={(text) => updateIngredient(index, 'unit', text)}
                  placeholder="cup"
                  placeholderTextColor={colors.icon}
                />
                {formData.ingredients.length > 1 && (
                  <TouchableOpacity onPress={() => removeIngredient(index)} style={styles.removeButton}>
                    <Text style={[styles.removeButtonText, { color: colors.error }]}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={addIngredient}>
              <Text style={styles.addButtonText}>+ Add Ingredient</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 3:
        return (
          <ScrollView style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
            {formData.steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.stepInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={step.instruction}
                  onChangeText={(text) => updateStep(index, text)}
                  placeholder="Describe this step..."
                  placeholderTextColor={colors.icon}
                  multiline
                />
                {formData.steps.length > 1 && (
                  <TouchableOpacity onPress={() => removeStep(index)} style={styles.removeButton}>
                    <Text style={[styles.removeButtonText, { color: colors.error }]}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={addStep}>
              <Text style={styles.addButtonText}>+ Add Step</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.cancelButton, { color: colors.primary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Recipe</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressSteps}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  { backgroundColor: currentStep >= step ? colors.primary : colors.border },
                ]}
              />
              {step < 3 && (
                <View
                  style={[
                    styles.progressLine,
                    { backgroundColor: currentStep > step ? colors.primary : colors.border },
                  ]}
                />
              )}
            </View>
          ))}
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: currentStep === 1 ? colors.primary : colors.secondary }]}>
            Details
          </Text>
          <Text style={[styles.progressLabel, { color: currentStep === 2 ? colors.primary : colors.secondary }]}>
            Ingredients
          </Text>
          <Text style={[styles.progressLabel, { color: currentStep === 3 ? colors.primary : colors.secondary }]}>
            Steps
          </Text>
        </View>
      </View>

      {renderStepContent()}

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.footerButton, styles.backButton, { borderColor: colors.border }]}
            onPress={previousStep}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        )}
        {currentStep < 3 ? (
          <TouchableOpacity
            style={[styles.footerButton, styles.nextButton, { backgroundColor: colors.primary }]}
            onPress={nextStep}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerButton, styles.nextButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>Save Recipe</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressContainer: {
    padding: 20,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressLine: {
    width: 80,
    height: 2,
    marginHorizontal: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  checkboxContainer: {
    marginTop: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  ingredientName: {
    flex: 2,
  },
  ingredientQty: {
    flex: 1,
  },
  ingredientUnit: {
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepInput: {
    flex: 1,
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    borderWidth: 2,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {},
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
