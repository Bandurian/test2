"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ShoppingItem {
  id: string
  product_name: string
  quantity: number
  unit: string
  is_purchased: boolean
}

interface MealPlan {
  id: string
  name: string
  start_date: string
  end_date: string
}

interface GeneratedIngredient {
  name: string
  quantity: number
  unit: string
  recipes: string[]
}

export default function ShoppingListTab() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [generatedIngredients, setGeneratedIngredients] = useState<GeneratedIngredient[]>([])
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [newItem, setNewItem] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [unit, setUnit] = useState("pcs")
  const [activeTab, setActiveTab] = useState<"manual" | "from-plan">("from-plan")
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchItems()
    fetchMealPlanAndGenerateList()
  }, [])

  const fetchMealPlanAndGenerateList = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      // Get current meal plan
      const { data: planData, error: planError } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("start_date", { ascending: false })
        .limit(1)
        .single()

      if (planError && planError.code !== "PGRST116") throw planError

      if (planData) {
        setMealPlan(planData)
        await generateIngredientsFromPlan(planData)
      }
    } catch (error) {
      console.error("Error fetching meal plan:", error)
    }
  }

  const generateIngredientsFromPlan = async (plan: MealPlan) => {
    setIsGenerating(true)
    try {
      // Get all meal entries for this plan
      const { data: mealEntries, error: mealsError } = await supabase
        .from("meal_plan_entries")
        .select("recipe_id, servings, recipes(title)")
        .eq("meal_plan_id", plan.id)
        .gte("meal_date", plan.start_date)
        .lte("meal_date", plan.end_date)

      if (mealsError) throw mealsError

      if (!mealEntries || mealEntries.length === 0) {
        setGeneratedIngredients([])
        return
      }

      // Aggregate ingredients from all recipes
      const ingredientMap: { [key: string]: GeneratedIngredient } = {}

      for (const entry of mealEntries) {
        if (!entry.recipe_id) continue

        const { data: recipeIngredients, error: ingredientsError } = await supabase
          .from("recipe_ingredients")
          .select("ingredient_name, quantity, unit")
          .eq("recipe_id", entry.recipe_id)

        if (ingredientsError) throw ingredientsError

        const recipeTitle = (entry.recipes as any)?.title || "Unknown Recipe"

        for (const ingredient of recipeIngredients || []) {
          const key = `${ingredient.ingredient_name.toLowerCase()}|${ingredient.unit}`

          if (!ingredientMap[key]) {
            ingredientMap[key] = {
              name: ingredient.ingredient_name,
              quantity: 0,
              unit: ingredient.unit,
              recipes: [],
            }
          }

          ingredientMap[key].quantity += ingredient.quantity * entry.servings
          if (!ingredientMap[key].recipes.includes(recipeTitle)) {
            ingredientMap[key].recipes.push(recipeTitle)
          }
        }
      }

      setGeneratedIngredients(Object.values(ingredientMap).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      console.error("Error generating ingredients:", error)
      toast({
        title: "Error",
        description: "Failed to generate shopping list from meal plan",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data, error } = await supabase
        .from("shopping_lists")
        .select("id")
        .eq("user_id", authData.user.id)
        .is("meal_plan_id", null)
        .single()

      if (error && error.code !== "PGRST116") throw error

      let listId = data?.id

      if (!listId) {
        const { data: newList, error: createError } = await supabase
          .from("shopping_lists")
          .insert({
            user_id: authData.user.id,
            name: "Manual Shopping List",
          })
          .select("id")
          .single()

        if (createError) throw createError
        listId = newList?.id
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("shopping_list_items")
        .select("*")
        .eq("shopping_list_id", listId)

      if (itemsError) throw itemsError
      setItems(itemsData || [])
    } catch (error) {
      console.error("Error fetching items:", error)
      toast({
        title: "Error",
        description: "Failed to load shopping list",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = async () => {
    if (!newItem.trim()) {
      toast({
        title: "Error",
        description: "Please enter an item name",
        variant: "destructive",
      })
      return
    }

    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data: list } = await supabase
        .from("shopping_lists")
        .select("id")
        .eq("user_id", authData.user.id)
        .is("meal_plan_id", null)
        .single()

      const { error } = await supabase.from("shopping_list_items").insert({
        shopping_list_id: list.id,
        product_name: newItem,
        quantity: Number.parseFloat(quantity) || 1,
        unit: unit,
        is_purchased: false,
      })

      if (error) throw error

      setNewItem("")
      setQuantity("1")
      await fetchItems()

      toast({
        title: "Success",
        description: "Item added to shopping list",
      })
    } catch (error) {
      console.error("Error adding item:", error)
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      })
    }
  }

  const toggleItem = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("shopping_list_items").update({ is_purchased: !currentStatus }).eq("id", id)

      if (error) throw error
      await fetchItems()
    } catch (error) {
      console.error("Error updating item:", error)
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      })
    }
  }

  const removeItem = async (id: string) => {
    try {
      const { error } = await supabase.from("shopping_list_items").delete().eq("id", id)

      if (error) throw error
      await fetchItems()

      toast({
        title: "Success",
        description: "Item removed",
      })
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      })
    }
  }

  const addIngredientToManualList = async (ingredient: GeneratedIngredient) => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      let { data: list } = await supabase
        .from("shopping_lists")
        .select("id")
        .eq("user_id", authData.user.id)
        .is("meal_plan_id", null)
        .single()

      if (!list) {
        const { data: newList, error: createError } = await supabase
          .from("shopping_lists")
          .insert({
            user_id: authData.user.id,
            name: "Manual Shopping List",
          })
          .select("id")
          .single()

        if (createError) throw createError
        list = newList
      }

      const { error } = await supabase.from("shopping_list_items").insert({
        shopping_list_id: list.id,
        product_name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        is_purchased: false,
      })

      if (error) throw error

      await fetchItems()
      setActiveTab("manual")

      toast({
        title: "Success",
        description: `${ingredient.name} added to your shopping list`,
      })
    } catch (error) {
      console.error("Error adding ingredient:", error)
      toast({
        title: "Error",
        description: "Failed to add ingredient",
        variant: "destructive",
      })
    }
  }

  const addAllIngredientsToManualList = async () => {
    if (generatedIngredients.length === 0) return

    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      let { data: list } = await supabase
        .from("shopping_lists")
        .select("id")
        .eq("user_id", authData.user.id)
        .is("meal_plan_id", null)
        .single()

      if (!list) {
        const { data: newList, error: createError } = await supabase
          .from("shopping_lists")
          .insert({
            user_id: authData.user.id,
            name: "Manual Shopping List",
          })
          .select("id")
          .single()

        if (createError) throw createError
        list = newList
      }

      const itemsToInsert = generatedIngredients.map((ing) => ({
        shopping_list_id: list.id,
        product_name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        is_purchased: false,
      }))

      const { error } = await supabase.from("shopping_list_items").insert(itemsToInsert)

      if (error) throw error

      await fetchItems()
      setActiveTab("manual")

      toast({
        title: "Success",
        description: `${generatedIngredients.length} ingredients added to your shopping list`,
      })
    } catch (error) {
      console.error("Error adding all ingredients:", error)
      toast({
        title: "Error",
        description: "Failed to add ingredients",
        variant: "destructive",
      })
    }
  }

  const purchasedCount = items.filter((i) => i.is_purchased).length

  if (isLoading) {
    return <div className="text-center py-12">Loading shopping list...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Shopping List</h2>
        <p className="text-muted-foreground">
          Manage your shopping items or generate from your meal plan
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "from-plan")}>
        <TabsList>
          <TabsTrigger value="from-plan">From Meal Plan</TabsTrigger>
          <TabsTrigger value="manual">Manual List ({items.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="from-plan" className="mt-6 space-y-6">
          {mealPlan ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{mealPlan.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {mealPlan.start_date} to {mealPlan.end_date}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => generateIngredientsFromPlan(mealPlan)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? "Refreshing..." : "Refresh"}
                      </Button>
                      {generatedIngredients.length > 0 && (
                        <Button onClick={addAllIngredientsToManualList}>
                          Add All to List
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {isGenerating ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Generating shopping list from your meal plan...</p>
                </div>
              ) : generatedIngredients.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground mb-2">No ingredients found in your meal plan</p>
                    <p className="text-sm text-muted-foreground">
                      Add some meals to your weekly plan first, then come back here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    {generatedIngredients.length} ingredients from your planned meals
                  </p>
                  {generatedIngredients.map((ingredient, index) => (
                    <Card key={index}>
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className="flex-1">
                          <p className="font-medium">{ingredient.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {ingredient.quantity} {ingredient.unit}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            From: {ingredient.recipes.join(", ")}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addIngredientToManualList(ingredient)}
                        >
                          Add to List
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground mb-2">No meal plan found</p>
                <p className="text-sm text-muted-foreground">
                  Create a meal plan in the Weekly tab first
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Item name..."
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addItem()}
                  className="flex-1"
                />
                <Input
                  placeholder="Qty"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0.1"
                  step="0.1"
                  className="w-20"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="pcs">pcs</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">l</option>
                  <option value="ml">ml</option>
                  <option value="lbs">lbs</option>
                  <option value="oz">oz</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="cup">cup</option>
                </select>
                <Button onClick={addItem} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {purchasedCount} of {items.length} items purchased
            </p>
          </div>

          <div className="space-y-2">
            {items.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-muted-foreground">No items in your shopping list</p>
              </Card>
            ) : (
              items.map((item) => (
                <Card key={item.id} className={item.is_purchased ? "bg-muted/50" : ""}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <Checkbox
                      checked={item.is_purchased}
                      onCheckedChange={() => toggleItem(item.id, item.is_purchased)}
                      className="border-primary"
                    />
                    <div className="flex-1">
                      <p className={item.is_purchased ? "line-through text-muted-foreground" : "font-medium"}>
                        {item.product_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-destructive">
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
