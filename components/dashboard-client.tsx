"use client"

import MealPlannerTab from "@/components/meal-planner-tab"
import RecipesTab from "@/components/recipes-tab"
import ShoppingListTab from "@/components/shopping-list-tab"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WeeklyPlannerTab from "@/components/weekly-planner-tab"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import Link, { useRouter } from "expo-router"
import { useState } from "react"

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("today")

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary hover:opacity-80">
            MealHub
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Link href="/profile">
              <Button variant="outline" size="sm">
                Profile
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="shopping">Shopping</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            <MealPlannerTab />
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4">
            <RecipesTab currentUserId={user.id} />
          </TabsContent>

          <TabsContent value="shopping" className="space-y-4">
            <ShoppingListTab />
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <WeeklyPlannerTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
