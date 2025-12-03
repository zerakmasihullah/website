"use client"

import Link from "next/link"
import { Home, ArrowLeft, ChefHat } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-2xl w-full text-center">
        {/* Logo/Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-orange-500/10 dark:bg-orange-500/20 rounded-full flex items-center justify-center">
              <ChefHat className="w-16 h-16 md:w-20 md:h-20 text-orange-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 md:w-16 md:h-16 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-2xl md:text-3xl shadow-lg">
              404
            </div>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
          Page Not Found
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-2">
          Oops! The page you're looking for doesn't exist.
        </p>
        <p className="text-sm md:text-base text-muted-foreground mb-8">
          It might have been moved, deleted, or you entered the wrong URL.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Home className="w-5 h-5" />
            <span>Go to Home</span>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-8 py-3 bg-card hover:bg-accent border border-border text-foreground font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <Link href="/" className="text-orange-500 hover:text-orange-600 underline">
              Browse our menu
            </Link>
            {" or "}
            <Link href="/orders" className="text-orange-500 hover:text-orange-600 underline">
              check your orders
            </Link>
          </p>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}

