"use client"

import AuthModal from "@/components/auth-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "expo-router"; // <-- ИЗМЕНИЛИ
import { Suspense, useEffect, useState } from "react"


interface Recipe {
  id: string
  title: string
  description: string
  prep_time: number
  cook_time: number
  servings: number
  calories_per_serving: number
  image_url: string | null
}

const Loading = () => null

export default function HomePage() {
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: "login" | "signup" }>({
    open: false,
    mode: "login",
  })
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check URL params for auth modal
    const authParam = searchParams.get("auth")
    if (authParam === "login" || authParam === "signup") {
      setAuthModal({ open: true, mode: authParam })
      // Clean URL
      router.replace("/", { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    checkAuth()
    fetchPublicRecipes()
  }, [])

  const checkAuth = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setIsAuthenticated(true)
      setUserEmail(data.user.email)
    }
  }

  const fetchPublicRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, description, prep_time, cook_time, servings, calories_per_serving, image_url")
        .eq("is_public", true)
        .limit(6)
        .order("created_at", { ascending: false })

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error fetching recipes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const openAuth = (mode: "login" | "signup") => {
    setAuthModal({ open: true, mode })
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setIsAuthenticated(false)
      setUserEmail(null)
      router.push("/")
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="text-2xl font-bold text-primary">MealHub</div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground hidden md:block">{userEmail}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/profile")}
              >
                Profile
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => openAuth("login")}>
                Login
              </Button>
              <Button
                onClick={() => openAuth("signup")}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-balance">
              Plan meals.
              <span className="text-primary"> Simplify shopping.</span>
            </h1>
            <p className="text-xl text-muted-foreground text-balance">
              MealHub makes meal planning effortless. Build weekly plans, auto-generate shopping lists, and save time
              cooking.
            </p>
            <div className="flex gap-4 pt-4">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  onClick={() => router.push("/dashboard")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => openAuth("signup")}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Get Started
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => openAuth("login")}>
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="bg-card rounded-xl p-8 border border-border shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold">Choose recipes</p>
                  <p className="text-sm text-muted-foreground">Browse our collection or add your own</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold">Plan your week</p>
                  <p className="text-sm text-muted-foreground">Drag and drop meals to your calendar</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold">Shop smarter</p>
                  <p className="text-sm text-muted-foreground">Auto-generated shopping list ready to go</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-card border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-12 text-center">Why choose MealHub?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Smart Planning</h3>
              <p className="text-muted-foreground">
                Organize weekly or monthly meal plans with an intuitive calendar interface.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Auto Shopping Lists</h3>
              <p className="text-muted-foreground">
                Instantly generate shopping lists grouped by product with exact quantities.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Quick and Easy</h3>
              <p className="text-muted-foreground">
                Save time with our fast, minimal interface designed for busy people.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recipes Preview Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl font-bold">Popular Recipes</h2>
              <p className="text-muted-foreground mt-2">Discover delicious meals from our community</p>
            </div>
            {!isAuthenticated && (
              <Button variant="outline" onClick={() => openAuth("signup")}>
                Sign up to see more
              </Button>
            )}
          </div>

          <Suspense fallback={<Loading />}>
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-40 bg-muted rounded-lg mb-4" />
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recipes.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">No recipes available yet. Be the first to add one!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                  <Card key={recipe.id} className="hover:shadow-lg transition-shadow overflow-hidden group">
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url || "/placeholder.svg"}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-16 h-16 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13m0-13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg line-clamp-1">{recipe.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {recipe.description || "A delicious recipe waiting to be discovered"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {recipe.servings} servings
                        </span>
                        {recipe.calories_per_serving && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                            </svg>
                            {recipe.calories_per_serving} kcal
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Suspense>

          {!isAuthenticated && recipes.length > 0 && (
            <div className="text-center mt-12">
              <p className="text-muted-foreground mb-4">
                Sign up to access all recipes, create your own, and start planning meals
              </p>
              <Button
                size="lg"
                onClick={() => openAuth("signup")}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Create Free Account
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="max-w-7xl mx-auto px-6 text-center text-muted-foreground">
          <p>MealHub - Your personal meal planning assistant</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        defaultMode={authModal.mode}
      />
    </main>
  )
}
