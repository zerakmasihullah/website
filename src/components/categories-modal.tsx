"use client"

import { X } from "lucide-react"

interface Category {
  id: string
  label: string
}

interface CategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  activeCategory: string
  onCategoryClick: (id: string) => void
}

export default function CategoriesModal({
  isOpen,
  onClose,
  categories,
  activeCategory,
  onCategoryClick,
}: CategoriesModalProps) {
  if (!isOpen) return null

  const handleCategoryClick = (categoryId: string) => {
    onCategoryClick(categoryId)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-3xl md:rounded-2xl w-full md:max-w-md md:max-h-[80vh] h-[85vh] md:h-auto flex flex-col overflow-hidden shadow-2xl border-t md:border border-border transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 md:p-6 pb-4 border-b border-border flex-shrink-0">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Categories</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition p-2 hover:bg-accent rounded-lg -mr-2"
            aria-label="Close categories"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Categories List */}
        <div className="overflow-y-auto flex-1">
          <div className="py-1">
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`w-full px-5 md:px-6 py-4 md:py-4 text-left transition active:bg-accent ${
                  activeCategory === category.id
                    ? "bg-orange-500/20 text-orange-400 border-l-4 border-orange-500"
                    : "text-foreground hover:bg-accent"
                } ${index !== categories.length - 1 ? "border-b border-border" : ""}`}
              >
                <span className="text-base md:text-base font-medium">{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

