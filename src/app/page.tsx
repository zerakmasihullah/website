"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Star, Users, Info, X, Clock, MapPin, Receipt, Home, Building2, ShoppingBag, Bike } from "lucide-react"
import Header from "@/components/header"
import HeroSection from "@/components/hero-section"
import MenuCategories from "@/components/menu-categories"
import MenuSection from "@/components/menu-section"
import BasketSidebar from "@/components/basket-sidebar"
import MobileBasket from "@/components/mobile-basket"
import ProductModal from "@/components/product-modal"
import MyAccountModal from "@/components/my-account-modal"
import CategoriesModal from "@/components/categories-modal"
import { getMenuCategories, getAllMenuItems, getPopularMenuItems, searchMenuItems, type Menu, type MenuItem } from "@/lib/api"
import HighlightsCarousel from "@/components/highlights-carousel"
import { getImageUrl } from "@/lib/image-utils"

// Helper function to get today's date string in Ireland timezone
const getIrelandDateString = (): string => {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0')
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
  return `${year}-${month}-${day}`
}

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

export default function RestaurantMenu() {
  const [activeCategory, setActiveCategory] = useState("highlights")
  const [basketItems, setBasketItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [menuCategories, setMenuCategories] = useState<Menu[]>([])
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([])
  const [highlightItems, setHighlightItems] = useState<MenuItem[]>([])
  const [searchResults, setSearchResults] = useState<MenuItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [activeInfoTab, setActiveInfoTab] = useState<'reviews' | 'info'>('info')
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false)
  const [isRestaurantClosedModalOpen, setIsRestaurantClosedModalOpen] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(64)
  const [stickySearchHeight, setStickySearchHeight] = useState(0)

  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const heroRef = useRef<HTMLDivElement>(null)
  const restaurantInfoRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const stickySearchRef = useRef<HTMLDivElement>(null)
  const isScrollingProgrammatically = useRef(false)

  // Calculate header height and sticky search height on mount and resize
  useEffect(() => {
    const updateHeights = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight
        setHeaderHeight(height)
      }
      if (stickySearchRef.current) {
        const height = stickySearchRef.current.offsetHeight
        setStickySearchHeight(height)
      }
    }

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      updateHeights()
    })
    
    // Also try after a small delay to catch any dynamic content
    const timeoutId = setTimeout(updateHeights, 100)
    
    window.addEventListener('resize', updateHeights)
    return () => {
      window.removeEventListener('resize', updateHeights)
      clearTimeout(timeoutId)
    }
  }, [])

  // Load basket items from localStorage on mount
  useEffect(() => {
    const loadBasket = () => {
      try {
        const savedBasket = localStorage.getItem('basketItems')
        if (savedBasket) {
          const parsed = JSON.parse(savedBasket)
          if (Array.isArray(parsed)) {
            setBasketItems(parsed)
          }
        } else {
          setBasketItems([])
        }
      } catch (error) {
      }
    }

    loadBasket()

    // Listen for custom event when basket is cleared
    const handleBasketCleared = () => {
      setBasketItems([])
    }

    window.addEventListener('basketCleared', handleBasketCleared)

    return () => {
      window.removeEventListener('basketCleared', handleBasketCleared)
    }
  }, [])

  // Save basket items to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('basketItems', JSON.stringify(basketItems))
    } catch (error) {
    }
  }, [basketItems])

  // Check if restaurant is open (opens at 15:00 Ireland time)
  useEffect(() => {
    const checkRestaurantStatus = () => {
      try {
        // Get current time in Ireland (Europe/Dublin timezone)
        const now = new Date()
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Europe/Dublin',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        })
        
        const parts = formatter.formatToParts(now)
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
        const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
        const month = parseInt(parts.find(p => p.type === 'month')?.value || '0')
        const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
        
        const currentTimeInMinutes = hour * 60 + minute
        const openingTimeInMinutes = 15 * 60 // 15:00 = 900 minutes

        // Check if restaurant is closed (before 15:00)
        if (currentTimeInMinutes < openingTimeInMinutes) {
          // Check if user has already dismissed this modal today
          const lastDismissed = localStorage.getItem('restaurantClosedModalDismissed')
          const today = getIrelandDateString()
          
          if (lastDismissed !== today) {
            setIsRestaurantClosedModalOpen(true)
          }
        }
      } catch (error) {
        // If timezone detection fails, don't show modal
        console.error('Error checking restaurant status:', error)
      }
    }

    checkRestaurantStatus()
  }, [])

  // Fetch menu categories, all menu items, and popular items for highlights
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setApiError(false)
      try {
        const [categories, items, popularItems] = await Promise.all([
          getMenuCategories(),
          getAllMenuItems(),
          getPopularMenuItems(),
        ])
        
        if (categories.length > 0) {
          setMenuCategories(categories)
        }
        
        if (items.length > 0) {
          setAllMenuItems(items)
        }

        if (popularItems.length > 0) {
          setHighlightItems(popularItems.slice(0, 4)) // Show top 4 popular items
        }
      } catch (error) {
        setApiError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle search with API
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true)
        try {
          const results = await searchMenuItems(searchQuery)
          setSearchResults(results)
        } catch (error) {
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }

    const debounceTimer = setTimeout(() => {
      performSearch()
    }, 500) // Debounce search by 500ms

    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  // Map API categories to UI categories (including highlights)
  // Ensure no duplicate IDs by checking if "highlights" already exists
  const categoryMap = new Map<string, { id: string; label: string; apiId: number | undefined }>()
  
  // Add highlights first
  categoryMap.set("highlights", { id: "highlights", label: "Highlights", apiId: undefined })
  
  // Sort menu categories: items with "deal" in title/name come first
  const sortedMenuCategories = [...menuCategories].sort((a, b) => {
    const aTitle = (a.title?.toLowerCase() || a.name?.toLowerCase() || "")
    const bTitle = (b.title?.toLowerCase() || b.name?.toLowerCase() || "")
    const aHasDeal = aTitle.includes("deal")
    const bHasDeal = bTitle.includes("deal")
    
    // Items with "deal" come first
    if (aHasDeal && !bHasDeal) return -1
    if (!aHasDeal && bHasDeal) return 1
    
    // If both have "deal" or both don't, maintain original order
    return 0
  })
  
  // Add menu categories, ensuring uniqueness
  sortedMenuCategories
    .filter((menu) => {
      const title = menu.title?.toLowerCase() || menu.name?.toLowerCase() || ""
      return title !== "highlights"
    })
    .forEach((menu) => {
      const baseId = menu.title?.toLowerCase().replace(/\s+/g, "-") || menu.name?.toLowerCase().replace(/\s+/g, "-") || `menu-${menu.id}`
      // Ensure unique ID - if it already exists or is "highlights", use menu ID
      let id = baseId
      if (id === "highlights" || categoryMap.has(id)) {
        id = `menu-${menu.id}`
      }
      categoryMap.set(id, {
        id,
        label: menu.title || menu.name || `Menu ${menu.id}`,
        apiId: menu.id,
      })
    })
  
  const categories = Array.from(categoryMap.values())

  const handleCategoryClick = (categoryId: string) => {
    isScrollingProgrammatically.current = true
    setActiveCategory(categoryId)
    
    requestAnimationFrame(() => {
      const section = sectionRefs.current[categoryId]
      if (section) {
        const headerOffset = headerHeight + stickySearchHeight + 20
        const elementPosition = section.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        })
        
        setTimeout(() => {
          isScrollingProgrammatically.current = false
          requestAnimationFrame(() => {
            setActiveCategory(categoryId)
          })
        }, 1200)
      } else {
        isScrollingProgrammatically.current = false
      }
    })
  }

  // Handle scroll to detect when restaurant info section is scrolled past
  useEffect(() => {
    const handleScroll = () => {
      if (restaurantInfoRef.current) {
        const rect = restaurantInfoRef.current.getBoundingClientRect()
        // Check if the restaurant info section has been scrolled past
        setIsScrolled(rect.bottom <= headerHeight)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    // Check initial scroll position
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [headerHeight])

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null
    
    const handleScroll = () => {
      if (isScrollingProgrammatically.current) {
        return
      }

      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      scrollTimeout = setTimeout(() => {
        let activeSectionId: string | null = null
        const scrollPosition = window.scrollY
        const headerOffset = headerHeight + stickySearchHeight + 20
        const thresholdTop = scrollPosition + headerOffset

        for (let i = categories.length - 1; i >= 0; i--) {
          const category = categories[i]
          const section = sectionRefs.current[category.id]
          if (section) {
            const { offsetTop } = section
            if (thresholdTop >= offsetTop) {
              activeSectionId = category.id
              break
            }
          }
        }

        if (activeSectionId && activeSectionId !== activeCategory) {
          setActiveCategory(activeSectionId)
        }
      }, 150)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [categories, headerHeight, stickySearchHeight, activeCategory])

  const addToBasket = (item: any) => {
    setBasketItems((prev) => [...prev, item])
  }

  const scrollToProduct = (productId: number) => {
    // Try to find the product element directly by data attribute
    const productElement = document.querySelector(`[data-product-id="${productId}"]`) as HTMLElement
    if (productElement) {
      const headerOffset = headerHeight + stickySearchHeight + 20
      const elementPosition = productElement.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
      
      // Highlight the product briefly
      productElement.style.transition = 'box-shadow 0.3s ease'
      productElement.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.5)'
      setTimeout(() => {
        productElement.style.boxShadow = ''
      }, 2000)
      return
    }

    // Fallback: Find the product in the menu items and scroll to category
    const product = allMenuItems.find(item => item.id === productId)
    if (!product) return

    // Find which category this product belongs to
    const productCategory = menuCategories.find(cat => cat.id === product.menu_id)
    if (!productCategory) return

    // Get category ID for scrolling
    const categoryId = productCategory.title?.toLowerCase().replace(/\s+/g, "-") || `menu-${productCategory.id}`
    
    // Check if category exists in our category map
    const category = categories.find(cat => cat.apiId === productCategory.id)
    if (category) {
      handleCategoryClick(category.id)
      // After scrolling to category, try to find and highlight the product
      setTimeout(() => {
        const productEl = document.querySelector(`[data-product-id="${productId}"]`) as HTMLElement
        if (productEl) {
          productEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          productEl.style.transition = 'box-shadow 0.3s ease'
          productEl.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.5)'
          setTimeout(() => {
            productEl.style.boxShadow = ''
          }, 2000)
        }
      }, 500)
    } else {
      // Fallback: scroll to the category section
      const section = sectionRefs.current[categoryId]
      if (section) {
        const headerOffset = headerHeight + stickySearchHeight + 20
        const elementPosition = section.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        })
      }
    }
  }

  const updateItemQuantity = (index: number, newQty: number) => {
    setBasketItems((prev) => {
      const updated = [...prev]
      const item = updated[index]
      const unitPrice = item.totalPrice / item.quantity
      updated[index] = {
        ...item,
        quantity: newQty,
        totalPrice: unitPrice * newQty,
      }
      return updated
    })
  }

  const removeItem = (index: number) => {
    setBasketItems((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div ref={headerRef} className="sticky top-0 z-50 bg-background">
        <Header onMenuClick={() => setIsAccountModalOpen(true)} />
      </div>

      <div className="flex w-full">
        <div className="flex-1 min-w-0 lg:mr-[320px]">
          <div ref={heroRef}>
            <HeroSection />
          </div>
          
          <div className="px-4 md:px-6 lg:px-16 xl:px-24">

          {/* Restaurant Info */}
          <div ref={restaurantInfoRef} className="py-4 border-b border-border">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2 flex-1">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">Oscar's Pizza & Kebab</h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-foreground" />
                      <span className="text-foreground text-sm">Min. € 10.00</span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1">
                      <Bike className="w-3.5 h-3.5 text-foreground" />
                      <span className="text-foreground text-sm">€ 3.00</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsInfoModalOpen(true)}
                  className="text-foreground hover:text-orange-500 transition p-1"
                >
                  <Info className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Sticky Search and Categories - Full Width */}
          <div 
            ref={stickySearchRef}
            className={`sticky z-40 bg-background transition-all duration-200 ${isScrolled ? 'shadow-lg border-b border-border' : ''}`} 
            style={{ 
              position: 'sticky',
              top: headerHeight ? `${headerHeight}px` : '64px',
              zIndex: 40
            }}
          >
            <div className="px-4 md:px-6 lg:px-16 xl:px-24">
              <div className="py-3 md:py-4">
                <div className="relative">
                  <Search className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                  <input
                    type="text"
                    placeholder="Search in Oscar's Pizza & Kebab"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 md:pl-14 pr-4 md:pr-5 py-3 md:py-3.5 bg-card text-foreground text-sm md:text-base placeholder-muted-foreground rounded-full border-2 border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition shadow-md"
                  />
                </div>
              </div>

              {loading ? (
                <div className="py-2">
                  <div className="text-muted-foreground text-sm">Loading categories...</div>
                </div>
              ) : (
                <MenuCategories
                  categories={categories}
                  activeCategory={activeCategory}
                  setActiveCategory={handleCategoryClick}
                  onListClick={() => setIsCategoriesModalOpen(true)}
                />
              )}
            </div>
          </div>

          {/* Show search results if searching, otherwise show normal menu */}
          <div className="px-4 md:px-6 lg:px-16 xl:px-24">
          {searchQuery.trim().length > 2 ? (
            <div className="py-6 md:py-8">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-4 md:mb-6">
                Search Results for "{searchQuery}"
              </h2>
              {isSearching ? (
                <div className="text-muted-foreground">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {searchResults.map((item) => {
                    let formattedPrice: string
                    if (item.price === null || item.price === undefined) {
                      formattedPrice = '€ 0.00'
                    } else if (typeof item.price === 'number') {
                      formattedPrice = `€ ${item.price.toFixed(2)}`
                    } else {
                      const priceStr = String(item.price)
                      formattedPrice = priceStr.startsWith('€') 
                        ? priceStr.replace('€', '€ ')
                        : `€ ${priceStr}`
                    }
                    return (
                      <div
                        key={item.id}
                        data-product-id={item.id}
                        className="bg-card rounded-lg p-3 flex items-start gap-3 hover:bg-accent transition cursor-pointer border border-border"
                        onClick={() => setSelectedProduct(item)}
                      >
                        <div className="flex-1 min-w-0 pr-2 md:pr-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <h3 className="text-foreground font-semibold text-sm">{stripHtml(item.title)}</h3>
                            {item.average_rating && item.average_rating > 0 && (
                              <span className="text-orange-500 text-xs">⭐ {item.average_rating}</span>
                            )}
                          </div>
                          <p className="text-foreground font-semibold text-xs mb-1">{formattedPrice}</p>
                          {item.description && (
                            <p className="text-muted-foreground text-xs line-clamp-2">{stripHtml(item.description)}</p>
                          )}
                        </div>
                        {(() => {
                          const imageUrl = getImageUrl(item.image)
                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.title}
                              className="w-16 h-12 md:w-20 md:h-16 object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.currentTarget
                                if (!target.dataset.errorHandled) {
                                  target.dataset.errorHandled = 'true'
                                  target.style.display = 'none'
                                }
                              }}
                            />
                          ) : null
                        })()}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-gray-400">No results found</div>
              )}
            </div>
          ) : apiError ? (
            <div className="py-6">
              <div className="text-red-400 mb-4">Unable to connect to API. Please check your API configuration.</div>
              {allMenuItems.length > 0 && (
                <div className="text-gray-400 text-sm mb-4">Showing cached menu items:</div>
              )}
            </div>
          ) : (
            <>
              {/* Highlights Section */}
              <div
                key="highlights-section"
                ref={(el) => {
                  sectionRefs.current["highlights"] = el
                }}
                id="highlights"
              >
                {loading ? (
                  <div className="py-4">
                    <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">Highlights</h2>
                    <div className="text-muted-foreground text-sm">Loading highlights...</div>
                  </div>
                ) : highlightItems.length > 0 ? (
                  <HighlightsCarousel items={highlightItems} onSelectProduct={setSelectedProduct} />
                ) : null}
              </div>

              {/* Menu Categories */}
              {categories.slice(1).map((category) => (
                <div
                  key={`category-${category.id}`}
                  ref={(el) => {
                    sectionRefs.current[category.id] = el
                  }}
                  id={category.id}
                >
                  <MenuSection
                    categoryId={category.id}
                    categoryLabel={category.label}
                    categoryApiId={category.apiId}
                    searchQuery={searchQuery}
                    onAddToBasket={addToBasket}
                    onSelectProduct={setSelectedProduct}
                  />
                </div>
              ))}
            </>
          )}
          </div>
        </div>

        <div className="hidden lg:block fixed top-0 right-0 h-screen w-[320px] z-30">
          <BasketSidebar 
            key={basketItems.length} 
            items={basketItems} 
            onUpdateQuantity={updateItemQuantity} 
            onRemoveItem={removeItem}
            onItemClick={scrollToProduct}
          />
        </div>
      </div>

      {/* Mobile Basket */}
      <MobileBasket 
        items={basketItems} 
        onUpdateQuantity={updateItemQuantity} 
        onRemoveItem={removeItem}
        onItemClick={scrollToProduct}
      />

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToBasket={addToBasket} />
      )}

      {/* My Account Modal */}
      <MyAccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
      />

      {/* Categories Modal */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
      />

      {/* Restaurant Closed Modal */}
      {isRestaurantClosedModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          onClick={() => {
            setIsRestaurantClosedModalOpen(false)
            localStorage.setItem('restaurantClosedModalDismissed', getIrelandDateString())
          }}
        >
          <div
            className="bg-card rounded-3xl max-w-md w-full flex flex-col overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 pb-4 flex-shrink-0 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">We're Currently Closed</h2>
              </div>
              <button 
                onClick={() => {
                  setIsRestaurantClosedModalOpen(false)
                  // Save dismissal to localStorage so it doesn't show again today
                  localStorage.setItem('restaurantClosedModalDismissed', getIrelandDateString())
                }} 
                className="text-muted-foreground hover:text-foreground hover:bg-accent transition p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 flex-1">
              <div className="space-y-4">
                <p className="text-foreground text-base leading-relaxed">
                  Thank you for visiting Oscar's Pizza & Kebab! We're currently closed and will be opening at <span className="font-bold text-orange-500">3:00 PM</span> today.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You can still browse our menu and place an order for later. We'll prepare your order fresh when we open!
                </p>
                <div className="bg-muted/50 rounded-xl p-4 border border-border mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-foreground font-semibold text-sm">Delivery Times</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { day: 'Monday', time: '15:00 - 00:30' },
                      { day: 'Tuesday', time: '15:00 - 00:30' },
                      { day: 'Wednesday', time: '15:00 - 00:30' },
                      { day: 'Thursday', time: '15:00 - 00:30' },
                      { day: 'Friday', time: '15:00 - 01:30' },
                      { day: 'Saturday', time: '15:00 - 01:30' },
                      { day: 'Sunday', time: '15:00 - 01:30' },
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground text-xs font-medium">{item.day}</span>
                        <span className="text-foreground text-xs font-semibold">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setIsRestaurantClosedModalOpen(false)
                  // Save dismissal to localStorage so it doesn't show again today
                  localStorage.setItem('restaurantClosedModalDismissed', getIrelandDateString())
                }}
                className="flex-1 px-4 py-3 bg-muted hover:bg-accent text-foreground font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsRestaurantClosedModalOpen(false)
                  // Save dismissal to localStorage so it doesn't show again today
                  localStorage.setItem('restaurantClosedModalDismissed', getIrelandDateString())
                }}
                className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition dark:bg-orange-600"
              >
                Order for Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Info Modal */}
      {isInfoModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsInfoModalOpen(false)}
        >
          <div
            className="bg-card rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-5 md:p-6 pb-4 flex-shrink-0 border-b border-border bg-gradient-to-r from-card to-accent/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Info className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">About Us</h2>
              </div>
              <button 
                onClick={() => setIsInfoModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground hover:bg-accent transition p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="px-5 md:px-6 py-5 overflow-y-auto flex-1 scrollbar-hide">
              <div className="space-y-6">
                  {/* Address and Map */}
                  <div>
                    <div className="bg-card rounded-xl overflow-hidden border border-border shadow-lg">
                      <div className="relative w-full h-64 md:h-72">
                        <iframe
                          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2429.123456789!2d-8.6264!3d52.6680!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTLCsDQwJzA0LjgiTiA4wrAzNyczNS4wIlc!5e0!3m2!1sen!2sie!4v1234567890123!5m2!1sen!2sie"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="w-full h-full"
                        />
                        {/* Address Overlay */}
                        <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-md rounded-xl p-3 shadow-xl max-w-xs border border-border">
                          <div className="flex items-start gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-orange-500 mt-0.5" />
                            <p className="text-foreground text-sm font-semibold">17 John's Street, Limerick, LIMERICK</p>
                          </div>
                          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition shadow-md w-full dark:bg-orange-600">
                            Open in Maps
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* About Us */}
                  <div className="bg-card rounded-xl p-5 border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Home className="w-4 h-4 text-orange-500" />
                      </div>
                      A Little Bit About Us
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      Indulge your taste buds in a flavorful journey at Oscar's Kebab & Pizza, your ultimate destination for mouthwatering kebabs and delectable Pizza. Our chefs skillfully craft each dish, combining traditional recipes with a modern twist, ensuring every bite is a burst of authentic flavors. Whether you're craving a succulent shawarma, tender grilled meats, or vegetarian delights, Oscar's has something to satisfy every palate. Experience the essence of Middle Eastern and Mediterranean cuisine, all conveniently available for takeaway. Elevate your mealtime today!
                    </p>
                  </div>

                  {/* Delivery Times */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-orange-500" />
                      </div>
                      Delivery Times
                    </h3>
                    <div className="bg-card rounded-xl p-4 border border-border">
                      <div className="space-y-2.5">
                        {[
                          { day: 'Monday', time: '15:00 - 00:30' },
                          { day: 'Tuesday', time: '15:00 - 00:30' },
                          { day: 'Wednesday', time: '15:00 - 00:30' },
                          { day: 'Thursday', time: '15:00 - 00:30' },
                          { day: 'Friday', time: '15:00 - 01:30' },
                          { day: 'Saturday', time: '15:00 - 01:30' },
                          { day: 'Sunday', time: '15:00 - 01:30' },
                        ].map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                            <span className="text-muted-foreground text-sm font-medium">{item.day}</span>
                            <span className="text-foreground text-sm font-semibold">{item.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Delivery Fee */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Receipt className="w-4 h-4 text-orange-500" />
                      </div>
                      Delivery Information
                    </h3>
                    <div className="bg-card rounded-xl p-4 border border-border">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-muted-foreground text-sm">Minimum order amount</span>
                          <span className="text-orange-500 text-base font-bold">€ 10.00</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-muted-foreground text-sm">Delivery fee</span>
                          <span className="text-orange-500 text-base font-bold">€ 3.00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-orange-500" />
                      </div>
                      Business Details
                    </h3>
                    <div className="bg-card rounded-xl p-4 border border-border">
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start gap-2">
                            <Building2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-muted-foreground text-sm block mb-1">Business Name</span>
                              <span className="text-foreground text-sm font-semibold">Oscar's Pizza & Kebab</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 pt-2 border-t border-border">
                            <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-muted-foreground text-sm block mb-1">Address</span>
                              <span className="text-foreground text-sm font-semibold">17 John's Street<br />Limerick, Limerick</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

