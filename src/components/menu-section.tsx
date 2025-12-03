"use client"

import { Plus, Info } from "lucide-react"
import { useEffect, useState } from "react"
import { getMenuItemsByCategory, type MenuItem } from "@/lib/api"
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

interface MenuSectionProps {
  categoryId: string
  categoryLabel: string
  categoryApiId?: number // The actual menu ID from the API
  searchQuery: string
  onAddToBasket: (item: any) => void
  onSelectProduct: (product: any) => void
}

export default function MenuSection({
  categoryId,
  categoryLabel,
  categoryApiId,
  searchQuery,
  onAddToBasket,
  onSelectProduct,
}: MenuSectionProps) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchItems = async () => {
      if (categoryApiId) {
        setLoading(true)
        try {
          const data = await getMenuItemsByCategory(categoryApiId)
          // Log first item to debug structure
          if (data && data.length > 0) {
          }
          setItems(data)
        } catch (error) {
          setItems([])
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
        setItems([])
      }
    }

    fetchItems()
  }, [categoryApiId])

  const filteredItems = items.filter(
    (item) => {
      const cleanTitle = stripHtml(item.title).toLowerCase()
      const cleanDescription = item.description ? stripHtml(item.description).toLowerCase() : ''
      const query = searchQuery.toLowerCase()
      return cleanTitle.includes(query) || cleanDescription.includes(query)
    }
  )

  if (loading) {
    return (
      <div className="py-4">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">{categoryLabel}</h2>
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  if (filteredItems.length === 0) return null

  return (
    <div className="py-3 md:py-4">
      {/* Section header with item count */}
      <div className="flex items-center justify-between mb-4 md:mb-5">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{categoryLabel}</h2>
        <span className="text-muted-foreground text-xs md:text-sm font-medium bg-card px-2.5 py-1 rounded-full border border-border">{filteredItems.length} items</span>
      </div>

      {/* List layout - one item per row */}
      <div className="flex flex-col gap-2 md:gap-3">
        {filteredItems.map((item) => {
          // Check if item has multiple sizes
          const hasMultipleSizes = item.size && item.size.length > 0
          
          // Format price with Euro symbol and space
          let formattedPrice: string
          let priceValue: number = 0
          
          if (hasMultipleSizes && item.size && item.size.length > 0) {
            // Get prices from sizes array and find minimum
            const prices = item.size
              .map((size) => {
                if (typeof size.price === 'number') {
                  return size.price
                } else if (typeof size.price === 'string') {
                  // Extract number from string (handle "€ 10.50" or "10.50")
                  const numStr = size.price.replace(/[€\s,]/g, '')
                  return parseFloat(numStr) || 0
                }
                return 0
              })
              .filter((p) => p > 0)
            
            if (prices.length > 0) {
              priceValue = Math.min(...prices)
            }
          } else {
            // Use main price if no sizes
            if (item.price === null || item.price === undefined) {
              priceValue = 0
            } else if (typeof item.price === 'number') {
              priceValue = item.price
            } else {
              // Extract number from string
              const priceStr = String(item.price).replace(/[€\s,]/g, '')
              priceValue = parseFloat(priceStr) || 0
            }
          }
          
          // Format the price
          formattedPrice = `€ ${priceValue.toFixed(2)}`

          return (
            <div
              key={item.id}
              data-product-id={item.id}
              className="bg-card rounded-xl p-3 md:p-4 lg:p-5 flex items-center gap-4 md:gap-5 hover:bg-accent hover:shadow-lg transition cursor-pointer border border-border"
              onClick={() => onSelectProduct(item)}
            >
              {/* Left side - Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-foreground font-bold text-base md:text-lg lg:text-xl">{stripHtml(item.title)}</h3>
                  <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center flex-shrink-0 transition">
                    <Info className="w-2.5 h-2.5 md:w-3 md:h-3 text-foreground" />
                  </div>
                </div>
                <p className="text-foreground font-bold text-base md:text-lg lg:text-xl mb-1.5">
                  {hasMultipleSizes && <span className="text-muted-foreground font-normal text-sm">from </span>}
                  {formattedPrice}
                </p>
                {item.description && (
                  <p className="text-muted-foreground text-xs md:text-sm lg:text-base leading-relaxed line-clamp-2">{stripHtml(item.description)}</p>
                )}
              </div>

              {/* Right side - Image with overlay icon */}
              {(() => {
                const imageUrl = getImageUrl(item.image)
                return imageUrl ? (
                  <div className="relative flex-shrink-0">
                    <div className="relative w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32">
                      <img
                        key={item.id}
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget
                          if (!target.dataset.errorHandled) {
                            target.dataset.errorHandled = 'true'
                            target.style.display = 'none'
                            // Hide the entire image container when image fails
                            const container = target.closest('.relative.flex-shrink-0') as HTMLElement
                            if (container) {
                              container.style.display = 'none'
                            }
                          }
                        }}
                      />
                      {/* Overlay icon - white circle with plus sign */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectProduct(item)
                        }}
                        className="absolute top-1.5 right-1.5 w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-100 hover:scale-110 transition shadow-xl z-10"
                        aria-label="View product details"
                      >
                        <Plus className="w-4 h-4 md:w-5 md:h-5 font-bold" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ) : null
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
