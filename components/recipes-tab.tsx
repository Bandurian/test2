"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RecipeEditor from "@/components/recipe-editor"

interface Recipe {
  id: string
  title: string
  description: string
  image_url: string
  prep_time: number
  cook_time: number
  servings: number
  calories_per_serving: number
  user_id?: string
  is_public?: boolean
  category_id?: string
}

interface RecipeWithDetails extends Recipe {
  ingredients?: Array<{ id: string; ingredient_name: string; quantity: number; unit: string }>
  steps?: Array<{ id: string; step_number: number; instruction: string }>
  tags?: Array<{ id: string; tag_name: string }>
}

interface FilterOptions {
  maxCalories: number
  maxPrepTime: number
  servings: number
}

export default function RecipesTab({ currentUserId }: { currentUserId: string }) {
  const [baseRecipes, setBaseRecipes] = useState<Recipe[]>([])
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    maxCalories: 1000,
    maxPrepTime: 120,
    servings: 0,
  })
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithDetails | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [recipeTab, setRecipeTab] = useState<"base" | "mine">("base")
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  const [isNewRecipe, setIsNewRecipe] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchRecipes()
  }, [searchQuery, filters])

  const fetchRecipes = async () => {
    setIsLoading(true)
    try {
      // Fetch base (public) recipes - not owned by current user or system recipes
      let baseQuery = supabase
        .from("recipes")
        .select("*")
        .eq("is_public", true)
        .or(`user_id.is.null,user_id.neq.${currentUserId}`)
        .order("title")

      if (searchQuery) {
        baseQuery = baseQuery.ilike("title", `%${searchQuery}%`)
      }
      if (filters.maxCalories < 1000) {
        baseQuery = baseQuery.lte("calories_per_serving", filters.maxCalories)
      }
      if (filters.maxPrepTime < 120) {
        baseQuery = baseQuery.lte("prep_time", filters.maxPrepTime)
      }
      if (filters.servings > 0) {
        baseQuery = baseQuery.eq("servings", filters.servings)
      }

      const { data: baseData, error: baseError } = await baseQuery

      if (baseError) throw baseError
      setBaseRecipes(baseData || [])

      // Fetch user's own recipes
      let myQuery = supabase
        .from("recipes")
        .select("*")
        .eq("user_id", currentUserId)
        .order("title")

      if (searchQuery) {
        myQuery = myQuery.ilike("title", `%${searchQuery}%`)
      }
      if (filters.maxCalories < 1000) {
        myQuery = myQuery.lte("calories_per_serving", filters.maxCalories)
      }
      if (filters.maxPrepTime < 120) {
        myQuery = myQuery.lte("prep_time", filters.maxPrepTime)
      }
      if (filters.servings > 0) {
        myQuery = myQuery.eq("servings", filters.servings)
      }

      const { data: myData, error: myError } = await myQuery

      if (myError) throw myError
      setMyRecipes(myData || [])
    } catch (error) {
      console.error("Error fetching recipes:", error)
      toast({
        title: "Error",
        description: "Failed to load recipes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openRecipeDetail = async (recipe: Recipe) => {
    try {
      // Fetch full recipe details
      const [ingredientsRes, stepsRes, tagsRes] = await Promise.all([
        supabase.from("recipe_ingredients").select("*").eq("recipe_id", recipe.id),
        supabase.from("recipe_steps").select("*").eq("recipe_id", recipe.id).order("step_number"),
        supabase.from("recipe_tags").select("*").eq("recipe_id", recipe.id),
      ])

      setSelectedRecipe({
        ...recipe,
        ingredients: ingredientsRes.data || [],
        steps: stepsRes.data || [],
        tags: tagsRes.data || [],
      })
      setIsDetailOpen(true)
    } catch (error) {
      console.error("Error fetching recipe details:", error)
      toast({
        title: "Error",
        description: "Failed to load recipe details",
        variant: "destructive",
      })
    }
  }

  const copyRecipeToMine = async (recipe: RecipeWithDetails) => {
    setIsCopying(true)
    try {
      // Create a copy of the recipe
      const { data: newRecipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          user_id: currentUserId,
          title: `${recipe.title} (Copy)`,
          description: recipe.description,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          servings: recipe.servings,
          calories_per_serving: recipe.calories_per_serving,
          image_url: recipe.image_url,
          category_id: recipe.category_id,
          is_public: false,
        })
        .select("id")
        .single()

      if (recipeError) throw recipeError

      // Copy ingredients
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const ingredientsCopy = recipe.ingredients.map((ing) => ({
          recipe_id: newRecipe.id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
        }))
        await supabase.from("recipe_ingredients").insert(ingredientsCopy)
      }

      // Copy steps
      if (recipe.steps && recipe.steps.length > 0) {
        const stepsCopy = recipe.steps.map((step) => ({
          recipe_id: newRecipe.id,
          step_number: step.step_number,
          instruction: step.instruction,
        }))
        await supabase.from("recipe_steps").insert(stepsCopy)
      }

      // Copy tags
      if (recipe.tags && recipe.tags.length > 0) {
        const tagsCopy = recipe.tags.map((tag) => ({
          recipe_id: newRecipe.id,
          tag_name: tag.tag_name,
        }))
        await supabase.from("recipe_tags").insert(tagsCopy)
      }

      toast({
        title: "Success",
        description: "Recipe copied to your collection",
      })

      setIsDetailOpen(false)
      setRecipeTab("mine")
      await fetchRecipes()
    } catch (error) {
      console.error("Error copying recipe:", error)
      toast({
        title: "Error",
        description: "Failed to copy recipe",
        variant: "destructive",
      })
    } finally {
      setIsCopying(false)
    }
  }

  const deleteRecipe = async (recipeId: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return

    try {
      // Delete related data first
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId)
      await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId)
      await supabase.from("recipe_tags").delete().eq("recipe_id", recipeId)
      
      // Delete the recipe
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Recipe deleted",
      })

      setIsDetailOpen(false)
      await fetchRecipes()
    } catch (error) {
      console.error("Error deleting recipe:", error)
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      })
    }
  }

  const openEditor = async (recipeId?: string, isNew: boolean = false) => {
    if (isNew) {
      // Create a draft recipe immediately to get an ID
      try {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData.user) {
          toast({
            title: "Error",
            description: "Please log in to create recipes",
            variant: "destructive",
          })
          return
        }

        const { data: newRecipe, error } = await supabase
          .from("recipes")
          .insert({
            user_id: authData.user.id,
            title: "New Recipe",
            description: "",
            prep_time: 15,
            cook_time: 30,
            servings: 4,
            calories_per_serving: 300,
            is_public: false,
          })
          .select("id")
          .single()

        if (error) throw error

        setEditingRecipeId(newRecipe.id)
        setIsNewRecipe(false) // Not a "new" recipe anymore since it has an ID
        setIsEditorOpen(true)
        setIsDetailOpen(false)
        await fetchRecipes()
      } catch (error) {
        console.error("Error creating recipe:", error)
        toast({
          title: "Error",
          description: "Failed to create recipe",
          variant: "destructive",
        })
      }
    } else {
      setEditingRecipeId(recipeId || null)
      setIsNewRecipe(false)
      setIsEditorOpen(true)
      setIsDetailOpen(false)
    }
  }

  const handleEditorSave = () => {
    fetchRecipes()
  }

  const activeFiltersCount =
    (filters.maxCalories < 1000 ? 1 : 0) +
    (filters.maxPrepTime < 120 ? 1 : 0) +
    (filters.servings > 0 ? 1 : 0)

  const currentRecipes = recipeTab === "base" ? baseRecipes : myRecipes
  const isMyRecipe = (recipe: Recipe) => recipe.user_id === currentUserId

  if (isLoading) {
    return <div className="text-center py-12">Loading recipes...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Recipes</h2>
          <p className="text-muted-foreground">Browse and manage your recipe collection</p>
        </div>
        <Button
          onClick={() => openEditor(undefined, true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          + Create Recipe
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={activeFiltersCount > 0 ? "border-primary" : ""}
        >
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>
      </div>

      {showFilters && (
        <Card className="p-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Max Calories: {filters.maxCalories}</Label>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={filters.maxCalories}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxCalories: Number.parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Prep Time: {filters.maxPrepTime} min</Label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={filters.maxPrepTime}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxPrepTime: Number.parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Servings: {filters.servings === 0 ? "Any" : filters.servings}</Label>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={filters.servings}
                onChange={(e) => setFilters((prev) => ({ ...prev, servings: Number.parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ maxCalories: 1000, maxPrepTime: 120, servings: 0 })}
            className="mt-2"
          >
            Reset Filters
          </Button>
        </Card>
      )}

      {/* Recipe Tabs */}
      <Tabs value={recipeTab} onValueChange={(v) => setRecipeTab(v as "base" | "mine")}>
        <TabsList>
          <TabsTrigger value="base">Base Recipes ({baseRecipes.length})</TabsTrigger>
          <TabsTrigger value="mine">My Recipes ({myRecipes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="mt-6">
          {baseRecipes.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-muted-foreground">No base recipes found</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {baseRecipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => openRecipeDetail(recipe)}
                >
                  {recipe.image_url ? (
                    <div className="h-32 overflow-hidden">
                      <img
                        src={recipe.image_url || "/placeholder.svg"}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <svg className="w-12 h-12 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-1">{recipe.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{recipe.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                      <span>{recipe.servings} servings</span>
                      {recipe.calories_per_serving && <span>{recipe.calories_per_serving} kcal</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-6">
          {myRecipes.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't created any recipes yet</p>
              <Button onClick={() => openEditor(undefined, true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Create Your First Recipe
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRecipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => openRecipeDetail(recipe)}
                >
                  <div className="h-32 relative overflow-hidden">
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url || "/placeholder.svg"}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                        <svg className="w-12 h-12 text-accent/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                    {recipe.is_public && (
                      <span className="absolute top-2 right-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        Public
                      </span>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-1">{recipe.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{recipe.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                      <span>{recipe.servings} servings</span>
                      {recipe.calories_per_serving && <span>{recipe.calories_per_serving} kcal</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recipe Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedRecipe.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {selectedRecipe.image_url && (
                  <div className="w-full h-48 rounded-lg overflow-hidden">
                    <img
                      src={selectedRecipe.image_url || "/placeholder.svg"}
                      alt={selectedRecipe.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {selectedRecipe.description && (
                  <p className="text-muted-foreground">{selectedRecipe.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Prep: {selectedRecipe.prep_time} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Cook: {selectedRecipe.cook_time} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Servings: {selectedRecipe.servings}</span>
                  </div>
                  {selectedRecipe.calories_per_serving && (
                    <div className="flex items-center gap-1">
                      <span>{selectedRecipe.calories_per_serving} kcal/serving</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.tags.map((tag) => (
                      <span key={tag.id} className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                        {tag.tag_name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ingredients */}
                {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Ingredients</h4>
                    <ul className="space-y-1">
                      {selectedRecipe.ingredients.map((ing) => (
                        <li key={ing.id} className="text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary rounded-full" />
                          {ing.quantity} {ing.unit} {ing.ingredient_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Steps */}
                {selectedRecipe.steps && selectedRecipe.steps.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Instructions</h4>
                    <ol className="space-y-3">
                      {selectedRecipe.steps.map((step) => (
                        <li key={step.id} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                            {step.step_number}
                          </span>
                          <p className="text-sm">{step.instruction}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {isMyRecipe(selectedRecipe) ? (
                    <>
                      <Button
                        onClick={() => openEditor(selectedRecipe.id)}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Edit Recipe
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => deleteRecipe(selectedRecipe.id)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => copyRecipeToMine(selectedRecipe)}
                      disabled={isCopying}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isCopying ? "Copying..." : "Add to My Recipes"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Recipe Editor */}
      <RecipeEditor
        recipeId={editingRecipeId}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleEditorSave}
        isNewRecipe={isNewRecipe}
      />
    </div>
  )
}
