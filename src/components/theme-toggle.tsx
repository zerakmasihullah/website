"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="relative w-12 h-6 rounded-full bg-gray-700 transition-colors p-1"
        aria-label="Toggle theme"
      >
        <div className="w-4 h-4 rounded-full bg-white transition-transform"></div>
      </button>
    )
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-12 h-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 dark:from-gray-700 dark:to-gray-800 transition-all duration-300 p-1 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <div
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
          isDark ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <Moon className="w-2.5 h-2.5 text-gray-800" />
        ) : (
          <Sun className="w-2.5 h-2.5 text-orange-500" />
        )}
      </div>
      <div className="flex items-center justify-between w-full h-full px-1">
        <Sun className={`w-3 h-3 transition-opacity duration-300 ${isDark ? "opacity-0" : "opacity-100 text-white"}`} />
        <Moon className={`w-3 h-3 transition-opacity duration-300 ${isDark ? "opacity-100 text-white" : "opacity-0"}`} />
      </div>
    </button>
  )
}

