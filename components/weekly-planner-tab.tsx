"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"


interface MealEntry {
  id: string
  meal_type: string
  recipe_id: string | null
  recipe_title?: string
  servings: number
  meal_date: string
}

interface Recipe {
  id: string
  title: string
}

interface MealPlan {
  id: string
  name: string
  start_date: string
  end_date: string
}

const mealTypes = [
  { type: "breakfast", emoji: "🌅" },
  { type: "lunch", emoji: "🍽️" },
  { type: "dinner", emoji: "🌙" },
  { type: "snack", emoji: "🥜" },
]

export default function WeeklyPlannerTab() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedMealType, setSelectedMealType] = useState<string>("")
  const [selectedRecipeId, setSelectedRecipeId] = useState("")
  const [servings, setServings] = useState("1")
  const [planName, setPlanName] = useState("")
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchMealPlan()
    fetchRecipes()
  }, [])

  useEffect(() => {
    if (mealPlan) {
      fetchMeals()
    }
  }, [mealPlan])

  const fetchMealPlan = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("start_date", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code === "PGRST116") {
        setShowCreatePlan(true)
      } else if (error) {
        throw error
      } else {
        setMealPlan(data)
      }
    } catch (error) {
      console.error("Error fetching meal plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMeals = async () => {
    if (!mealPlan) return

    try {
      const { data, error } = await supabase
        .from("meal_plan_entries")
        .select("*, recipes(title)")
        .eq("meal_plan_id", mealPlan.id)
        .gte("meal_date", mealPlan.start_date)
        .lte("meal_date", mealPlan.end_date)

      if (error && error.code !== "PGRST116") throw error
      setMeals(
        data?.map((item: any) => ({
          ...item,
          recipe_title: item.recipes?.title,
        })) || [],
      )
    } catch (error) {
      console.error("Error fetching meals:", error)
    }
  }

  const fetchRecipes = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      // Fetch both user's recipes and public recipes
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title")
        .or(`is_public.eq.true,user_id.eq.${authData.user.id}`)
        .order("title")

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error fetching recipes:", error)
    }
  }

  const createNewMealPlan = async () => {
    if (!planName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a plan name",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const today = new Date()
      const startDate = today.toISOString().split("T")[0]
      const endDate = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("meal_plans")
        .insert({
          user_id: authData.user.id,
          name: planName,
          start_date: startDate,
          end_date: endDate,
        })
        .select()
        .single()

      if (error) throw error

      setMealPlan(data)
      setPlanName("")
      setShowCreatePlan(false)

      toast({
        title: "Success",
        description: "Meal plan created successfully",
      })
    } catch (error) {
      console.error("Error creating meal plan:", error)
      toast({
        title: "Error",
        description: "Failed to create meal plan",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addMealToDate = async () => {
    if (!selectedRecipeId || !selectedDate || !selectedMealType) {
      toast({
        title: "Error",
        description: "Please select date, meal type, and recipe",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("meal_plan_entries").insert({
        meal_plan_id: mealPlan!.id,
        meal_type: selectedMealType,
        meal_date: selectedDate,
        recipe_id: selectedRecipeId,
        servings: Number.parseInt(servings) || 1,
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Meal added",
      })

      setSelectedRecipeId("")
      setSelectedDate("")
      setSelectedMealType("")
      setServings("1")
      await fetchMeals()
    } catch (error) {
      console.error("Error adding meal:", error)
      toast({
        title: "Error",
        description: "Failed to add meal",
        variant: "destructive",
      })
    }
  }

  const removeMeal = async (id: string) => {
    try {
      const { error } = await supabase.from("meal_plan_entries").delete().eq("id", id)

      if (error) throw error

      await fetchMeals()
      toast({
        title: "Success",
        description: "Meal removed",
      })
    } catch (error) {
      console.error("Error removing meal:", error)
      toast({
        title: "Error",
        description: "Failed to remove meal",
        variant: "destructive",
      })
    }
  }

  const handleViewShoppingList = () => {
    toast({
      title: "Shopping List",
      description: "Go to the Shopping tab to see ingredients from your meal plan",
    })
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!mealPlan) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Weekly Meal Planner</h2>
          <p className="text-muted-foreground">Create your first meal plan to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Meal Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                placeholder="e.g., Week of Dec 5"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <Button
              onClick={createNewMealPlan}
              disabled={isSaving}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? "Creating..." : "Create Meal Plan"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const weekDates = []
  const startDate = new Date(mealPlan.start_date)
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    weekDates.push(date.toISOString().split("T")[0])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">{mealPlan.name}</h2>
          <p className="text-muted-foreground">
            {mealPlan.start_date} to {mealPlan.end_date}
          </p>
        </div>
        <Button
          onClick={handleViewShoppingList}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          View Shopping List
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Meal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-select">Date</Label>
              <select
                id="date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="">Select date...</option>
                {weekDates.map((date) => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-type-select">Meal Type</Label>
              <select
                id="meal-type-select"
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="">Select meal...</option>
                {mealTypes.map((meal) => (
                  <option key={meal.type} value={meal.type}>
                    {meal.emoji} {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-select">Recipe</Label>
              <select
                id="recipe-select"
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="">Select recipe...</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings-input">Servings</Label>
              <div className="flex gap-2">
                <Input
                  id="servings-input"
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  min="1"
                  max="10"
                />
                <Button onClick={addMealToDate} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {weekDates.map((date) => {
          const dayMeals = meals.filter((m) => m.meal_date === date)
          const dateObj = new Date(date)
          const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" })
          const dayNum = dateObj.getDate()

          return (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {dayName} {dayNum}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mealTypes.map((mealType) => {
                  const meal = dayMeals.find((m) => m.meal_type === mealType.type)

                  return (
                    <div
                      key={mealType.type}
                      className="text-sm p-2 rounded border border-border bg-card hover:bg-muted transition-colors"
                    >
                      <div className="font-semibold text-xs mb-1">{mealType.emoji}</div>
                      {meal ? (
                        <div className="space-y-1">
                          <p className="line-clamp-2 text-xs font-medium">{meal.recipe_title}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMeal(meal.id)}
                            className="w-full h-6 text-xs text-destructive p-0"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">Not planned</p>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
