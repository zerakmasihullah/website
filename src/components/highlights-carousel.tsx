"use client"

import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useRef } from "react"
import type { MenuItem } from "@/lib/api"
import { getImageUrl } from "@/lib/image-utils"

// Helper function to strip HTML tags and decode HTML entities
const stripHtml = (html: string | null | undefined): string => {
  if (!html) return ''
  try {
    // Ensure it's a string
    const htmlStr = String(html)
    // Create a temporary div element to parse HTML
    const tmp = document.createElement('div')
    tmp.innerHTML = htmlStr
    // Get text content and replace HTML entities
    let text = tmp.textContent || tmp.innerText || ''
    // Replace common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
    return text
  } catch (error) {
    return String(html || '')
  }
}

interface HighlightsCarouselProps {
  items: MenuItem[]
  onSelectProduct: (item: MenuItem) => void
}

export default function HighlightsCarousel({ items, onSelectProduct }: HighlightsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="py-6">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">Highlights</h2>

      <div className="relative flex items-center">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute -left-2 z-10 flex items-center justify-center w-8 h-8 rounded-full text-orange-500 hover:text-orange-400 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pl-6 pr-6 w-full"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              data-product-id={item.id}
              className="flex-shrink-0 w-[200px] md:w-[260px] bg-card rounded-lg overflow-hidden flex cursor-pointer hover:bg-accent transition border border-border"
              onClick={() => onSelectProduct(item)}
            >
              {/* Image on left */}
              {(() => {
                const imageUrl = getImageUrl(item.image)
                return imageUrl ? (
                  <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
                    <img 
                      src={imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget
                        if (!target.dataset.errorHandled) {
                          target.dataset.errorHandled = 'true'
                          // Hide the entire image container when image fails
                          const container = target.parentElement as HTMLElement
                          if (container) {
                            container.style.display = 'none'
                          }
                        }
                      }}
                    />
                  </div>
                ) : null
              })()}

              {/* Content */}
              <div className="flex-1 p-2 md:p-3 flex flex-col justify-between min-w-0">
                <div>
                  {item.menu && (
                    <p className="text-muted-foreground text-xs">{stripHtml(item.menu.title || item.menu.name)}</p>
                  )}
                  <h3 className="text-foreground font-semibold text-xs md:text-sm leading-tight line-clamp-2">
                    {stripHtml(item.title)}
                  </h3>
                </div>
                <p className="text-orange-500 font-semibold text-xs md:text-sm">
                  {(() => {
                    if (item.price === null || item.price === undefined) {
                      return '€ 0.00'
                    } else if (typeof item.price === 'number') {
                      return `€ ${item.price.toFixed(2)}`
                    } else {
                      const priceStr = String(item.price)
                      if (priceStr.startsWith('€')) {
                        return priceStr.replace('€', '€ ')
                      } else if (!priceStr.includes('€')) {
                        return `€ ${priceStr}`
                      }
                      return priceStr
                    }
                  })()}
                </p>
              </div>

              {/* Add button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectProduct(item)
                }}
                className="self-start m-2 w-7 h-7 md:w-8 md:h-8 rounded-full border border-orange-500 text-orange-500 flex items-center justify-center hover:bg-orange-500 hover:text-white transition flex-shrink-0"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute -right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full text-orange-500 hover:text-orange-400 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
