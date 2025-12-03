"use client"

import { ChevronLeft, ChevronRight, List } from "lucide-react"
import { useRef, useEffect } from "react"

interface Category {
  id: string
  label: string
}

interface MenuCategoriesProps {
  categories: Category[]
  activeCategory: string
  setActiveCategory: (id: string) => void
  onListClick?: () => void
}

export default function MenuCategories({ categories, activeCategory, setActiveCategory, onListClick }: MenuCategoriesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    const activeButton = buttonRefs.current.get(activeCategory)
    if (activeButton && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current
        const button = activeButton
        
        if (container && button) {
          const scrollLeft = button.offsetLeft - (container.offsetWidth / 2) + (button.offsetWidth / 2)
          
          container.scrollTo({
            left: scrollLeft,
            behavior: "smooth",
          })
        }
      })
    }
  }, [activeCategory])

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="relative flex items-center gap-2 md:gap-3 py-4 md:py-5 border-b border-border bg-background transition-colors duration-300">
      {/* Left scroll button - hidden on mobile/tablet, visible on large screens */}
      <button
        onClick={() => scroll("left")}
        className="hidden lg:flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-card hover:bg-accent text-foreground hover:text-orange-500 transition shrink-0 shadow-lg"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Scrollable categories */}
      <div
        ref={scrollContainerRef}
        className="flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide flex-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((category) => (
          <button
            key={category.id}
            ref={(el) => {
              if (el) {
                buttonRefs.current.set(category.id, el)
              } else {
                buttonRefs.current.delete(category.id)
              }
            }}
            onClick={() => setActiveCategory(category.id)}
            className={`px-3 md:px-4 py-2 md:py-1.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-300 ease-in-out ${
              activeCategory === category.id 
                ? "bg-orange-500 text-white shadow-lg dark:bg-orange-600 scale-105" 
                : "text-foreground hover:bg-accent hover:text-orange-500"
            }`}
            style={{ minHeight: "unset", height: "32px", maxHeight: "36px" }}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Right scroll button - hidden on mobile/tablet, visible on large screens */}
      <button
        onClick={() => scroll("right")}
        className="hidden lg:flex items-center justify-center w-7 h-7 md:w-10 md:h-10 rounded-full bg-card hover:bg-accent text-foreground hover:text-orange-500 transition shrink-0 shadow-md"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* List view button */}
      <button 
        onClick={onListClick}
        className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-card hover:bg-accent text-foreground hover:text-orange-500 transition shrink-0 shadow-lg"
        aria-label="View all categories"
      >
        <List className="w-5 h-5 md:w-6 md:h-6" />
      </button>
    </div>
  )
}
