"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface RecipeStep {
  id?: string
  step_number: number
  instruction: string
}

interface RecipeIngredient {
  id?: string
  ingredient_name: string
  quantity: number
  unit: string
  category_id?: string
  category_name?: string
}

interface IngredientCategory {
  id: string
  name: string
}

interface RecipeCategory {
  id: string
  name: string
}

interface RecipeTag {
  id?: string
  tag_name: string
}

interface RecipeData {
  id?: string
  title: string
  description: string
  image_url: string | null
  prep_time: number
  cook_time: number
  servings: number
  calories_per_serving: number
  category_id: string | null
  is_public: boolean
}

interface RecipeEditorProps {
  recipeId?: string | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  isNewRecipe?: boolean
}

const defaultIngredientSuggestions = [
  "Tomato", "Onion", "Garlic", "Bell Pepper", "Carrot", "Broccoli", "Spinach", "Mushroom",
  "Chicken Breast", "Ground Beef", "Salmon", "Shrimp", "Tofu",
  "Pasta", "Rice", "Flour", "Bread", "Potato",
  "Olive Oil", "Butter", "Milk", "Cream", "Cheese", "Egg",
  "Lemon", "Lime", "Orange",
  "Salt", "Pepper", "Soy Sauce", "Ginger", "Basil", "Oregano", "Thyme", "Paprika", "Cumin"
]

export default function RecipeEditor({ recipeId, isOpen, onClose, onSave, isNewRecipe = false }: RecipeEditorProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [recipe, setRecipe] = useState<RecipeData>({
    title: "",
    description: "",
    image_url: null,
    prep_time: 15,
    cook_time: 30,
    servings: 4,
    calories_per_serving: 300,
    category_id: null,
    is_public: false,
  })
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [steps, setSteps] = useState<RecipeStep[]>([])
  const [tags, setTags] = useState<RecipeTag[]>([])
  const [recipeCategories, setRecipeCategories] = useState<RecipeCategory[]>([])
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([])
  const [dbIngredients, setDbIngredients] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // New ingredient form
  const [newIngredient, setNewIngredient] = useState({
    ingredient_name: "",
    quantity: 1,
    unit: "pcs",
  })
  const [ingredientSearch, setIngredientSearch] = useState("")
  const [filteredIngredients, setFilteredIngredients] = useState<string[]>([])
  
  // New step
  const [newStep, setNewStep] = useState("")
  
  // New tag
  const [newTag, setNewTag] = useState("")
  
  const supabase = createClient()
  const { toast } = useToast()

  // The actual recipe ID to use (either passed in or saved during creation)
  const currentRecipeId = savedRecipeId || recipeId

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      fetchDbIngredients()
      if (recipeId) {
        setSavedRecipeId(recipeId)
        fetchRecipeData(recipeId)
      } else {
        resetForm()
        setIsLoading(false)
      }
    }
  }, [isOpen, recipeId])

  const resetForm = () => {
    setRecipe({
      title: "",
      description: "",
      image_url: null,
      prep_time: 15,
      cook_time: 30,
      servings: 4,
      calories_per_serving: 300,
      category_id: null,
      is_public: false,
    })
    setIngredients([])
    setSteps([])
    setTags([])
    setActiveTab("details")
    setSavedRecipeId(null)
  }

  const fetchCategories = async () => {
    try {
      // Fetch recipe categories
      const { data: recipeCats } = await supabase
        .from("recipe_categories")
        .select("id, name")
        .order("name")

      setRecipeCategories(recipeCats || [])

      // Fetch ingredient categories
      const { data: ingredCats } = await supabase
        .from("ingredient_categories")
        .select("id, name")
        .order("name")

      setIngredientCategories(ingredCats || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchDbIngredients = async () => {
    try {
      const { data } = await supabase
        .from("recipe_ingredients")
        .select("ingredient_name")
        .limit(500)

      const uniqueIngredients = new Set<string>()
      data?.forEach((item) => uniqueIngredients.add(item.ingredient_name))
      defaultIngredientSuggestions.forEach((item) => uniqueIngredients.add(item))
      
      setDbIngredients(Array.from(uniqueIngredients).sort())
    } catch (error) {
      console.error("Error fetching ingredients:", error)
    }
  }

  const fetchRecipeData = async (id: string) => {
    setIsLoading(true)
    try {
      // Fetch recipe details
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .single()

      if (recipeError) throw recipeError

      setRecipe({
        id: recipeData.id,
        title: recipeData.title || "",
        description: recipeData.description || "",
        image_url: recipeData.image_url || null,
        prep_time: recipeData.prep_time || 15,
        cook_time: recipeData.cook_time || 30,
        servings: recipeData.servings || 4,
        calories_per_serving: recipeData.calories_per_serving || 300,
        category_id: recipeData.category_id,
        is_public: recipeData.is_public || false,
      })

      // Fetch ingredients with category info
      const { data: ingredientsData } = await supabase
        .from("recipe_ingredients")
        .select("*, ingredient_categories(name)")
        .eq("recipe_id", id)

      setIngredients(
        ingredientsData?.map((i) => ({
          ...i,
          category_name: i.ingredient_categories?.name,
        })) || []
      )

      // Fetch steps
      const { data: stepsData } = await supabase
        .from("recipe_steps")
        .select("*")
        .eq("recipe_id", id)
        .order("step_number")

      setSteps(stepsData || [])

      // Fetch tags
      const { data: tagsData } = await supabase
        .from("recipe_tags")
        .select("*")
        .eq("recipe_id", id)

      setTags(tagsData || [])
    } catch (error) {
      console.error("Error fetching recipe data:", error)
      toast({
        title: "Error",
        description: "Failed to load recipe data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Ingredient search filtering
  useEffect(() => {
    if (ingredientSearch.trim().length > 0) {
      const matches = dbIngredients.filter(
        (item) => item.toLowerCase().includes(ingredientSearch.toLowerCase())
      ).slice(0, 10)
      setFilteredIngredients(matches)
    } else {
      setFilteredIngredients([])
    }
  }, [ingredientSearch, dbIngredients])

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploadingImage(true)
    try {
      // Convert to base64 for storage (simpler approach without Supabase Storage)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setRecipe((prev) => ({ ...prev, image_url: base64 }))
        setIsUploadingImage(false)
        toast({
          title: "Success",
          description: "Image uploaded successfully",
        })
      }
      reader.onerror = () => {
        setIsUploadingImage(false)
        toast({
          title: "Error",
          description: "Failed to read image file",
          variant: "destructive",
        })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading image:", error)
      setIsUploadingImage(false)
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      })
    }
  }

  const removeImage = () => {
    setRecipe((prev) => ({ ...prev, image_url: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const saveRecipe = async () => {
    if (!recipe.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recipe title",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) throw new Error("Not authenticated")

      if (currentRecipeId) {
        // Update existing recipe
        const { error: updateError } = await supabase
          .from("recipes")
          .update({
            title: recipe.title,
            description: recipe.description,
            image_url: recipe.image_url,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            calories_per_serving: recipe.calories_per_serving,
            category_id: recipe.category_id,
            is_public: recipe.is_public,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentRecipeId)

        if (updateError) throw updateError

        toast({
          title: "Success",
          description: "Recipe saved successfully",
        })
        
        // Close the dialog and refresh list after successful update
        handleClose()
      } else {
        // Create new recipe
        const { data: newRecipe, error: createError } = await supabase
          .from("recipes")
          .insert({
            user_id: authData.user.id,
            title: recipe.title,
            description: recipe.description,
            image_url: recipe.image_url,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            calories_per_serving: recipe.calories_per_serving,
            category_id: recipe.category_id,
            is_public: recipe.is_public,
          })
          .select("id")
          .single()

        if (createError) throw createError
        
        setSavedRecipeId(newRecipe.id)
        
        toast({
          title: "Success",
          description: "Recipe created! Now you can add ingredients and steps.",
        })
        
        // Close the dialog and refresh list after successful creation
        handleClose()
      }
    } catch (error) {
      console.error("Error saving recipe:", error)
      toast({
        title: "Error",
        description: "Failed to save recipe",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to ensure recipe is saved before adding related data
  // Also updates existing recipe with current form data
  const ensureRecipeSaved = async (): Promise<string | null> => {
    if (!recipe.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recipe title first",
        variant: "destructive",
      })
      return null
    }

    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) throw new Error("Not authenticated")

      if (currentRecipeId) {
        // Update existing recipe with current form data
        const { error: updateError } = await supabase
          .from("recipes")
          .update({
            title: recipe.title,
            description: recipe.description,
            image_url: recipe.image_url,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            calories_per_serving: recipe.calories_per_serving,
            category_id: recipe.category_id,
            is_public: recipe.is_public,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentRecipeId)

        if (updateError) throw updateError
        return currentRecipeId
      } else {
        // Create new recipe
        const { data: newRecipe, error: createError } = await supabase
          .from("recipes")
          .insert({
            user_id: authData.user.id,
            title: recipe.title,
            description: recipe.description,
            image_url: recipe.image_url,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            calories_per_serving: recipe.calories_per_serving,
            category_id: recipe.category_id,
            is_public: recipe.is_public,
          })
          .select("id")
          .single()

        if (createError) throw createError
        
        setSavedRecipeId(newRecipe.id)
        return newRecipe.id
      }
    } catch (error) {
      console.error("Error saving recipe:", error)
      toast({
        title: "Error",
        description: "Failed to save recipe",
        variant: "destructive",
      })
      return null
    }
  }

  const addIngredient = async () => {
    if (!newIngredient.ingredient_name.trim()) {
      toast({
        title: "Error",
        description: "Please enter ingredient name",
        variant: "destructive",
      })
      return
    }

    const recipeIdToUse = await ensureRecipeSaved()
    if (!recipeIdToUse) return

    try {
      // Find category for this ingredient
      const matchingCategory = ingredientCategories.find((cat) => {
        const catName = cat.name.toLowerCase()
        const ingredName = newIngredient.ingredient_name.toLowerCase()
        if (catName.includes("vegetable") && ["tomato", "onion", "carrot", "broccoli", "spinach", "pepper"].some(v => ingredName.includes(v))) return true
        if (catName.includes("meat") && ["chicken", "beef", "pork", "lamb"].some(v => ingredName.includes(v))) return true
        if (catName.includes("dairy") && ["milk", "cheese", "butter", "cream", "yogurt"].some(v => ingredName.includes(v))) return true
        if (catName.includes("grain") && ["rice", "pasta", "bread", "flour"].some(v => ingredName.includes(v))) return true
        if (catName.includes("spice") && ["salt", "pepper", "cumin", "paprika", "oregano", "basil"].some(v => ingredName.includes(v))) return true
        return false
      })

      const { error } = await supabase.from("recipe_ingredients").insert({
        recipe_id: recipeIdToUse,
        ingredient_name: newIngredient.ingredient_name,
        quantity: newIngredient.quantity,
        unit: newIngredient.unit,
        category_id: matchingCategory?.id || null,
      })

      if (error) throw error

      setNewIngredient({ ingredient_name: "", quantity: 1, unit: "pcs" })
      setIngredientSearch("")
      await fetchRecipeData(recipeIdToUse)

      toast({ title: "Success", description: "Ingredient added" })
    } catch (error) {
      console.error("Error adding ingredient:", error)
      toast({ title: "Error", description: "Failed to add ingredient", variant: "destructive" })
    }
  }

  const removeIngredient = async (id?: string, index?: number) => {
    if (!id) {
      setIngredients((prev) => prev.filter((_, i) => i !== index))
      return
    }

    try {
      const { error } = await supabase.from("recipe_ingredients").delete().eq("id", id)
      if (error) throw error
      if (currentRecipeId) await fetchRecipeData(currentRecipeId)
      toast({ title: "Success", description: "Ingredient removed" })
    } catch (error) {
      console.error("Error removing ingredient:", error)
      toast({ title: "Error", description: "Failed to remove ingredient", variant: "destructive" })
    }
  }

  const addStep = async () => {
    if (!newStep.trim()) {
      toast({ title: "Error", description: "Please enter step description", variant: "destructive" })
      return
    }

    const recipeIdToUse = await ensureRecipeSaved()
    if (!recipeIdToUse) return

    try {
      const { error } = await supabase.from("recipe_steps").insert({
        recipe_id: recipeIdToUse,
        step_number: steps.length + 1,
        instruction: newStep,
      })

      if (error) throw error

      setNewStep("")
      await fetchRecipeData(recipeIdToUse)
      toast({ title: "Success", description: "Step added" })
    } catch (error) {
      console.error("Error adding step:", error)
      toast({ title: "Error", description: "Failed to add step", variant: "destructive" })
    }
  }

  const removeStep = async (id?: string, index?: number) => {
    if (!id) {
      setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 })))
      return
    }

    try {
      const { error } = await supabase.from("recipe_steps").delete().eq("id", id)
      if (error) throw error
      if (currentRecipeId) await fetchRecipeData(currentRecipeId)
      toast({ title: "Success", description: "Step removed" })
    } catch (error) {
      console.error("Error removing step:", error)
    }
  }

  const addTag = async () => {
    if (!newTag.trim()) return

    const recipeIdToUse = await ensureRecipeSaved()
    if (!recipeIdToUse) return

    try {
      const { error } = await supabase.from("recipe_tags").insert({
        recipe_id: recipeIdToUse,
        tag_name: newTag,
      })

      if (error) throw error

      setNewTag("")
      await fetchRecipeData(recipeIdToUse)
    } catch (error) {
      console.error("Error adding tag:", error)
    }
  }

  const removeTag = async (id?: string, index?: number) => {
    if (!id) {
      setTags((prev) => prev.filter((_, i) => i !== index))
      return
    }

    try {
      const { error } = await supabase.from("recipe_tags").delete().eq("id", id)
      if (error) throw error
      if (currentRecipeId) await fetchRecipeData(currentRecipeId)
    } catch (error) {
      console.error("Error removing tag:", error)
    }
  }

  const handleClose = () => {
    // Refresh recipes list when closing
    onSave()
    onClose()
    // Reset form after closing
    setTimeout(() => {
      resetForm()
    }, 200)
  }

  // Handle tab change - auto-save details when switching away from details tab
  const handleTabChange = async (newTab: string) => {
    if (activeTab === "details" && newTab !== "details") {
      // Auto-save recipe details before switching to other tabs
      await ensureRecipeSaved()
    }
    setActiveTab(newTab)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="steps">Steps</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Recipe Image</Label>
                <div className="flex items-start gap-4">
                  {recipe.image_url ? (
                    <div className="relative">
                      <img
                        src={recipe.image_url || "/placeholder.svg"}
                        alt="Recipe preview"
                        className="w-32 h-32 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-sm hover:bg-destructive/90"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="recipe-image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? "Uploading..." : "Upload Image"}
                    </Button>
                    <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG/WebP</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Recipe Title *</Label>
                <Input
                  id="title"
                  value={recipe.title}
                  onChange={(e) => setRecipe((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Spaghetti Carbonara"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={recipe.description}
                  onChange={(e) => setRecipe((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your recipe..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground min-h-24"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prep_time">Prep Time (min)</Label>
                  <Input
                    id="prep_time"
                    type="number"
                    value={recipe.prep_time}
                    onChange={(e) => setRecipe((prev) => ({ ...prev, prep_time: Number.parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cook_time">Cook Time (min)</Label>
                  <Input
                    id="cook_time"
                    type="number"
                    value={recipe.cook_time}
                    onChange={(e) => setRecipe((prev) => ({ ...prev, cook_time: Number.parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    type="number"
                    value={recipe.servings}
                    onChange={(e) => setRecipe((prev) => ({ ...prev, servings: Number.parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories/serving</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={recipe.calories_per_serving}
                    onChange={(e) => setRecipe((prev) => ({ ...prev, calories_per_serving: Number.parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={recipe.category_id || ""}
                  onChange={(e) => setRecipe((prev) => ({ ...prev, category_id: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">No category</option>
                  {recipeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={recipe.is_public}
                  onChange={(e) => setRecipe((prev) => ({ ...prev, is_public: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_public">Make this recipe public</Label>
              </div>

              {isNewRecipe && !currentRecipeId && (
                <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                  Save the recipe first to add ingredients, steps, and tags.
                </div>
              )}
            </TabsContent>

            {/* Ingredients Tab */}
            <TabsContent value="ingredients" className="space-y-4">
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2 space-y-2 relative">
                    <Label>Ingredient Name</Label>
                    <Input
                      placeholder="Start typing..."
                      value={newIngredient.ingredient_name}
                      onChange={(e) => {
                        setNewIngredient((prev) => ({ ...prev, ingredient_name: e.target.value }))
                        setIngredientSearch(e.target.value)
                      }}
                    />
                    {filteredIngredients.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredIngredients.map((ing, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => {
                              setNewIngredient((prev) => ({ ...prev, ingredient_name: ing }))
                              setFilteredIngredients([])
                            }}
                          >
                            {ing}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={newIngredient.quantity}
                      onChange={(e) => setNewIngredient((prev) => ({ ...prev, quantity: Number.parseFloat(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <select
                      value={newIngredient.unit}
                      onChange={(e) => setNewIngredient((prev) => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground h-10"
                    >
                      <option value="pcs">pcs</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">l</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                      <option value="cup">cup</option>
                    </select>
                  </div>
                </div>
                <Button onClick={addIngredient} className="mt-3">
                  Add Ingredient
                </Button>
              </Card>

              <div className="space-y-2">
                <h4 className="font-medium">Ingredients ({ingredients.length})</h4>
                {ingredients.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No ingredients added yet</p>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((ing, idx) => (
                      <div key={ing.id || idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{ing.quantity} {ing.unit} {ing.ingredient_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeIngredient(ing.id, idx)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Steps Tab */}
            <TabsContent value="steps" className="space-y-4">
              <Card className="p-4">
                <div className="space-y-2">
                  <Label>Step Description</Label>
                  <textarea
                    placeholder="Describe this step..."
                    value={newStep}
                    onChange={(e) => setNewStep(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground min-h-20"
                  />
                </div>
                <Button onClick={addStep} className="mt-3">
                  Add Step
                </Button>
              </Card>

              <div className="space-y-2">
                <h4 className="font-medium">Steps ({steps.length})</h4>
                {steps.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No steps added yet</p>
                ) : (
                  <div className="space-y-2">
                    {steps.map((step, idx) => (
                      <div key={step.id || idx} className="flex items-start gap-3 p-3 bg-muted rounded">
                        <span className="w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground rounded-full text-sm flex-shrink-0">
                          {step.step_number}
                        </span>
                        <p className="flex-1 text-sm">{step.instruction}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(step.id, idx)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tags Tab */}
            <TabsContent value="tags" className="space-y-4">
              <Card className="p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                  />
                  <Button onClick={addTag}>Add</Button>
                </div>
              </Card>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <span
                    key={tag.id || idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm"
                  >
                    {tag.tag_name}
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id, idx)}
                      className="hover:text-destructive"
                    >
                      x
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <p className="text-muted-foreground text-sm">No tags added yet</p>
                )}
              </div>
            </TabsContent>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleClose}>
                {currentRecipeId ? "Close" : "Cancel"}
              </Button>
              <Button
                onClick={saveRecipe}
                disabled={isSaving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? "Saving..." : currentRecipeId ? "Save Changes" : "Create Recipe"}
              </Button>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
