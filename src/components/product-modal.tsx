"use client"

import { X, Minus, Plus, Info, ChevronDown, ChevronUp, ChevronLeft } from "lucide-react"
import { useState, useMemo, useRef } from "react"
import { getImageUrl } from "@/lib/image-utils"

// Helper function to strip HTML tags and decode HTML entities
const stripHtml = (html: string | null | undefined): string => {
  if (!html) return ''
  try {
    const htmlStr = String(html)
    const tmp = document.createElement('div')
    tmp.innerHTML = htmlStr
    let text = tmp.textContent || tmp.innerText || ''
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    return text
  } catch (error) {
    return String(html || '')
  }
}

interface AddOn {
  id: number
  name: string
  price: number
}

interface OptionGroup {
  id: string
  title: string
  type: "radio" | "multi"
  required?: boolean
  maxSelect?: number
  options: { id: number; name: string; price: number }[]
}

interface Topping {
  id: number
  name: string
  required: number // This is the required amount (number of selections needed)
  is_optional: boolean
  attachments?: Array<{
    id: number
    name: string
    price: string | number
  }>
}

interface Product {
  id: number
  name?: string
  title?: string
  description?: string
  price: string | number
  pricePrefix?: string
  image?: string
  addOns?: AddOn[]
  optionGroups?: OptionGroup[]
  isDeal?: boolean
  topping?: Topping[]
  size?: Array<{
    id: number
    size: string
    price: string | number
  }>
}

interface ProductModalProps {
  product: Product
  onClose: () => void
  onAddToBasket: (item: any) => void
}

export default function ProductModal({ product, onClose, onAddToBasket }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [optionSelections, setOptionSelections] = useState<{ [groupId: string]: number[] }>({})
  const [optionQuantities, setOptionQuantities] = useState<{ [optionId: number]: number }>({})
  const [selectedSize, setSelectedSize] = useState<number | null>(null)
  const [showAllergyInfo, setShowAllergyInfo] = useState(false)
  const [imageError, setImageError] = useState(false)
  const groupRefs = useRef<{ [groupId: string]: HTMLDivElement | null }>({})

  // Convert API toppings to option groups format - dynamically from product data
  const convertToppingsToOptionGroups = (toppings: Topping[]): OptionGroup[] => {
    if (!toppings || toppings.length === 0) return []
    
    return toppings
      .filter((topping) => topping && topping.name)
      .map((topping) => {
        // Handle attachments (sub-options) or use topping itself as option
        const options = topping.attachments && topping.attachments.length > 0
          ? topping.attachments.map((attachment) => ({
              id: attachment.id,
              name: stripHtml(attachment.name || ''),
              price: typeof attachment.price === 'number' 
                ? attachment.price 
                : parseFloat(String(attachment.price || 0).replace(/[€\s,]/g, '')) || 0,
            }))
          : [{ 
              id: topping.id, 
              name: stripHtml(topping.name), 
              price: 0 
            }]

        // Determine if it's required or optional
        // required is a number indicating how many selections are needed
        // is_optional determines if the topping group itself is optional
        const isRequired = !topping.is_optional
        const requiredAmount = isRequired ? topping.required : undefined
        
        return {
          id: `topping-${topping.id}`,
          title: stripHtml(topping.name),
          type: "multi", // Always use multi-select to allow multiple selections for required toppings
          required: isRequired,
          maxSelect: requiredAmount, // Use required field from API as the required amount
          options,
        }
      })
  }

  // Get option groups from product (dynamically from API toppings)
  const apiToppingGroups = product.topping && product.topping.length > 0 
    ? convertToppingsToOptionGroups(product.topping)
    : []
  
  const allOptionGroups = apiToppingGroups.length > 0 
    ? apiToppingGroups 
    : product.optionGroups || []
  
  // Sort option groups: required first, then optional
  const optionGroups = [...allOptionGroups].sort((a, b) => {
    if (a.required && !b.required) return -1
    if (!a.required && b.required) return 1
    return 0
  })

  // Safely parse base price
  const getBasePrice = () => {
    if (!product.price) return 0
    if (typeof product.price === 'number') return product.price
    const priceStr = String(product.price).replace(/€/g, '').replace(/\s/g, '').trim()
    const parsed = Number.parseFloat(priceStr)
    return isNaN(parsed) ? 0 : parsed
  }
  const basePrice = getBasePrice()
  
  // Get size price if selected
  const getSizePrice = () => {
    if (selectedSize && product.size) {
      const selectedSizeOption = product.size.find(s => s.id === selectedSize)
      if (selectedSizeOption) {
        return typeof selectedSizeOption.price === 'number' 
          ? selectedSizeOption.price 
          : parseFloat(String(selectedSizeOption.price || 0))
      }
    }
    return 0
  }
  const sizePrice = getSizePrice()

  // Helper function to calculate total quantity for a group
  const getGroupTotalQuantity = (groupId: string, selections?: { [groupId: string]: number[] }, quantities?: { [optionId: number]: number }): number => {
    const currentSelections = selections || optionSelections
    const currentQuantities = quantities || optionQuantities
    const selected = currentSelections[groupId] || []
    let totalQty = 0
    selected.forEach((optId) => {
      totalQty += currentQuantities[optId] || 1
    })
    return totalQty
  }

  const optionsTotal = useMemo(() => {
    let total = 0
    optionGroups.forEach((group) => {
      const selected = optionSelections[group.id] || []
      selected.forEach((optId) => {
        const opt = group.options.find((o) => o.id === optId)
        if (opt) {
          const qty = optionQuantities[optId] || 1
          total += opt.price * qty
        }
      })
    })
    return total
  }, [optionSelections, optionQuantities, optionGroups])

  const itemTotal = (basePrice + sizePrice + optionsTotal) * quantity

  const canAdd = useMemo(() => {
    // Check if size is required and selected
    if (product.size && product.size.length > 0 && !selectedSize) {
      return false
    }
    
    // Check required option groups - check total quantity, not number of different options
    for (const group of optionGroups) {
      if (group.required) {
        const totalQty = getGroupTotalQuantity(group.id)
        const requiredAmount = group.maxSelect || 1 // Use maxSelect as required amount (default to 1)
        if (totalQty < requiredAmount) return false // Must have at least required_amount total quantity
      }
    }
    return true
  }, [optionGroups, optionSelections, optionQuantities, product.size, selectedSize])


  // Check if a required group is complete - based on total quantity
  const isGroupComplete = (group: OptionGroup, selections?: { [groupId: string]: number[] }, quantities?: { [optionId: number]: number }): boolean => {
    if (group.required) {
      const totalQty = getGroupTotalQuantity(group.id, selections, quantities)
      const requiredAmount = group.maxSelect || 1 // Use maxSelect as required amount (default to 1)
      return totalQty >= requiredAmount
    }
    // For optional groups, any selection is fine
    return true
  }

  // Scroll to next incomplete required group
  const scrollToNextRequired = (currentGroupId: string, currentSelections?: { [groupId: string]: number[] }, currentQuantities?: { [optionId: number]: number }) => {
    const currentIndex = optionGroups.findIndex(g => g.id === currentGroupId)
    if (currentIndex === -1) return

    // Find next required group that's not complete
    for (let i = currentIndex + 1; i < optionGroups.length; i++) {
      const group = optionGroups[i]
      if (group.required && !isGroupComplete(group, currentSelections, currentQuantities)) {
        const ref = groupRefs.current[group.id]
        if (ref) {
          setTimeout(() => {
            ref.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
          }, 100)
        }
        break
      }
    }
  }

  const handleRadioSelect = (groupId: string, optionId: number) => {
    setOptionSelections((prev) => {
      const newSelections = { ...prev, [groupId]: [optionId] }
      // Check if this group is now complete and scroll to next required
      const group = optionGroups.find(g => g.id === groupId)
      if (group?.required) {
        setTimeout(() => scrollToNextRequired(groupId, newSelections), 200)
      }
      return newSelections
    })
  }

  const handleMultiSelect = (groupId: string, optionId: number, maxSelect?: number) => {
    setOptionSelections((prev) => {
      const current = prev[groupId] || []
      if (current.includes(optionId)) {
        // Don't remove, just allow adding more - user can increase quantity
        // Only remove if quantity is 0 (handled by handleOptionQtyChange)
        return prev
      } else {
        // Check if this is a required group and if we've reached the max limit
        const group = optionGroups.find(g => g.id === groupId)
        if (group?.required && group.maxSelect) {
          // For required toppings, check total quantity, not number of different options
          const currentTotalQty = getGroupTotalQuantity(groupId, prev)
          if (currentTotalQty >= group.maxSelect) {
            // Already reached the required amount, don't allow adding more
            return prev
          }
        }
        
        // Add - enforce max limit for required toppings
        setOptionQuantities((q) => ({ ...q, [optionId]: 1 }))
        const newSelections = { ...prev, [groupId]: [...current, optionId] }
        
        // Check if this group is now complete and scroll to next required
        if (group?.required) {
          // Calculate new total quantity after adding this option
          const newQuantities = { ...optionQuantities, [optionId]: 1 }
          const newTotalQty = getGroupTotalQuantity(groupId, newSelections, newQuantities)
          const isComplete = group.maxSelect ? newTotalQty >= group.maxSelect : newTotalQty > 0
          if (isComplete) {
            setTimeout(() => scrollToNextRequired(groupId, newSelections, newQuantities), 200)
          }
        }
        
        return newSelections
      }
    })
  }

  const handleOptionQtyChange = (optionId: number, delta: number, groupId?: string) => {
    setOptionQuantities((prev) => {
      const current = prev[optionId] || 1
      const newQty = Math.max(0, current + delta)
      
      // If increasing quantity, check if we would exceed the required limit
      if (groupId && delta > 0 && newQty > current) {
        const group = optionGroups.find(g => g.id === groupId)
        if (group?.required && group.maxSelect) {
          // Calculate what the total quantity would be after this change
          const currentTotalQty = getGroupTotalQuantity(groupId)
          const additionalQty = newQty - current
          if (currentTotalQty + additionalQty > group.maxSelect) {
            // Would exceed limit, don't allow increase
            return prev
          }
        }
      }
      
      if (newQty === 0) {
        // Remove from selection
        const newPrev = { ...prev }
        delete newPrev[optionId]
        // Also remove from optionSelections
        setOptionSelections((sel) => {
          const newSel: { [key: string]: number[] } = {}
          Object.entries(sel).forEach(([gid, opts]) => {
            newSel[gid] = opts.filter((id) => id !== optionId)
          })
          return newSel
        })
        return newPrev
      }
      
      // Check if this completes a required group and scroll to next
      if (groupId && newQty > 0) {
        setTimeout(() => {
          setOptionSelections((currentSelections) => {
            const group = optionGroups.find(g => g.id === groupId)
            if (group?.required) {
              // Calculate total quantity with new quantity
              const newQuantities = { ...prev, [optionId]: newQty }
              const newTotalQty = getGroupTotalQuantity(groupId, currentSelections, newQuantities)
              const isComplete = group.maxSelect ? newTotalQty >= group.maxSelect : newTotalQty > 0
              if (isComplete) {
                scrollToNextRequired(groupId, currentSelections, newQuantities)
              }
            }
            return currentSelections
          })
        }, 200)
      }
      
      return { ...prev, [optionId]: newQty }
    })
  }

  const handleAddToBasket = () => {
    const selectedOptions: { groupTitle: string; items: { name: string; qty: number; price: number; id: number }[] }[] = []
    optionGroups.forEach((group) => {
      const selected = optionSelections[group.id] || []
      if (selected.length > 0) {
        const items = selected.map((optId) => {
          const opt = group.options.find((o) => o.id === optId)!
          return { name: opt.name, qty: optionQuantities[optId] || 1, price: opt.price, id: opt.id }
        })
        selectedOptions.push({ groupTitle: group.title, items })
      }
    })

    // Get selected size info
    const selectedSizeInfo = selectedSize && product.size 
      ? product.size.find(s => s.id === selectedSize)
      : null

    const basketItem = {
      ...product,
      name: (product as any).title || product.name || 'Product',
      quantity,
      selectedSize: selectedSizeInfo,
      selectedOptions,
      totalPrice: itemTotal,
    }
    onAddToBasket(basketItem)
    onClose()
  }

  return (
    <>
      {/* Allergy Info Modal */}
      {showAllergyInfo && (
        <div 
          className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-0 md:p-4" 
          onClick={() => setShowAllergyInfo(false)}
        >
          <div
            className="bg-card rounded-t-3xl md:rounded-xl max-w-md w-full h-[85vh] md:h-auto md:max-h-[80vh] flex flex-col shadow-2xl border-t md:border border-border transition-colors duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center p-4 md:p-5 pb-3 border-b border-border flex-shrink-0">
              <button
                onClick={() => setShowAllergyInfo(false)}
                className="text-foreground hover:text-muted-foreground transition mr-3"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg md:text-xl font-bold text-foreground">Item Info</h2>
            </div>

            {/* Content */}
            <div className="px-4 md:px-5 py-4 overflow-y-auto flex-1">
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
                {(product as any).title || product.name || 'Product'}
              </h3>
              
              <div className="text-foreground text-sm md:text-base leading-relaxed space-y-4">
                <p>
                  If you have a food allergy or intolerance (or someone you're ordering for has), phone the restaurant on{' '}
                  <a href="tel:+35361597178" className="underline">061597178</a>. Do not order if you cannot get the allergy information you need.
                </p>
                
              </div>
            </div>

            {/* Close Button */}
            <div className="p-4 md:p-5 border-t border-border flex-shrink-0">
              <button
                onClick={() => setShowAllergyInfo(false)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-full transition dark:bg-orange-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <div 
        className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4" 
        onClick={onClose}
      >
        <div
          className="bg-card rounded-t-3xl md:rounded-xl max-w-lg w-full h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col shadow-2xl border-t md:border border-border relative transition-colors duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button - Always visible */}
          <button 
            onClick={onClose} 
            className="absolute top-2 right-2 w-8 h-8 bg-background/90 hover:bg-background border border-border rounded-full flex items-center justify-center transition shadow-lg z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>

          {/* Product Image - Only show if image exists and hasn't errored */}
          {(() => {
            const imageUrl = getImageUrl(product.image)
            return imageUrl && !imageError ? (
              <div className="w-full h-48 md:h-56 bg-muted flex-shrink-0 relative">
                <img
                  src={imageUrl}
                  alt={(product as any).title || product.name || 'Product'}
                  className="w-full h-full object-cover"
                  onError={() => {
                    setImageError(true)
                  }}
                />
              </div>
            ) : null
          })()}

          {/* Title Below Image */}
          <div className={`px-3 md:px-4 ${getImageUrl(product.image) && !imageError ? 'pt-3' : 'pt-4'} pb-2 flex-shrink-0`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                {(product as any).title || product.name || 'Product'}
              </h2>
              {/* Info Icon - Immediately after product name */}
              <button
                onClick={() => setShowAllergyInfo(true)}
                className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition flex-shrink-0"
                aria-label="Item information"
              >
                <Info className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
              </button>
            </div>
          </div>

        {/* Product Description - Right after image */}
        {(product as any).description || product.description ? (
          <div className="px-3 md:px-4 pt-3 pb-1.5 flex-shrink-0 border-b border-border">
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
              {stripHtml((product as any).description || product.description || '')}
            </p>
          </div>
        ) : null}

        {/* Content - Scrollable */}
        <div className="px-3 md:px-4 py-3 space-y-3 overflow-y-auto flex-1 min-h-0">
          <>
            {/* Size Selection */}
              {product.size && product.size.length > 0 && (
                <div className="py-1.5">
                  <div className="flex justify-between items-center mb-2 md:mb-3">
                    <h3 className="text-sm md:text-base font-bold text-foreground">Select Size:</h3>
                    <span className="text-xs px-1.5 py-0.5 border border-border bg-muted text-foreground rounded-full">1 Required</span>
                  </div>
                  <div className="space-y-1.5">
                    {product.size.map((sizeOption) => {
                      const isSelected = selectedSize === sizeOption.id
                      const sizePrice = typeof sizeOption.price === 'number' 
                        ? sizeOption.price 
                        : parseFloat(String(sizeOption.price || 0))
                      
                      return (
                        <button
                          key={sizeOption.id}
                          onClick={() => setSelectedSize(sizeOption.id)}
                          className="w-full flex items-center gap-2 py-2 md:py-2.5 active:bg-accent rounded-full transition"
                        >
                          <div
                            className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "border-orange-500" : "border-border"
                            }`}
                          >
                            {isSelected && <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-orange-500" />}
                          </div>
                          <span className="flex-1 text-left text-foreground text-xs md:text-sm">{stripHtml(sizeOption.size)}</span>
                          {sizePrice > 0 && (
                            <span className="text-muted-foreground text-xs">+€ {sizePrice.toFixed(2)}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <hr className="border-border my-3" />
                </div>
              )}
              
              <div className="text-orange-500 font-semibold text-sm md:text-base">
                {(() => {
                  // If product has sizes and price is null/undefined, show size-based price
                  if (product.size && product.size.length > 0) {
                    if (selectedSize) {
                      // Show selected size price
                      const selectedSizeOption = product.size.find(s => s.id === selectedSize)
                      if (selectedSizeOption) {
                        const sizePrice = typeof selectedSizeOption.price === 'number' 
                          ? selectedSizeOption.price 
                          : parseFloat(String(selectedSizeOption.price || 0))
                        return `€ ${sizePrice.toFixed(2)}`
                      }
                    } else {
                      // Show "from" with minimum size price
                      const prices = product.size
                        .map(s => typeof s.price === 'number' ? s.price : parseFloat(String(s.price || 0)))
                        .filter(p => p > 0)
                      if (prices.length > 0) {
                        const minPrice = Math.min(...prices)
                        return `from € ${minPrice.toFixed(2)}`
                      }
                    }
                  }
                  
                  // Default: show base price
                  if (!product.price || product.price === null || product.price === 'null') {
                    return 'Price on selection'
                  }
                  
                  if (typeof product.price === 'number') {
                    return `€ ${product.price.toFixed(2)}`
                  }
                  
                  const priceStr = String(product.price)
                  if (priceStr === 'null' || priceStr === 'undefined') {
                    return 'Price on selection'
                  }
                  
                  return priceStr.startsWith('€') ? priceStr : `€ ${priceStr}`
                })()}
              </div>
          </>

          {optionGroups.map((group) => (
            <div 
              key={group.id} 
              ref={(el) => {
                groupRefs.current[group.id] = el
              }}
              className="py-1.5"
            >
              <div className="flex justify-between items-center mb-2 md:mb-3">
                <h3 className="text-sm md:text-base font-bold text-foreground">{group.title}</h3>
                {group.required ? (
                  <span className="text-xs px-1.5 py-0.5 border border-border bg-muted text-foreground rounded-full">
                    {group.maxSelect ? `${group.maxSelect} Required` : "1 Required"}
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 border border-border bg-muted text-foreground rounded-full">Optional</span>
                )}
              </div>

              <div className="space-y-1.5">
                {group.options.map((opt) => {
                  const isSelected = (optionSelections[group.id] || []).includes(opt.id)
                  const qty = optionQuantities[opt.id] || 0

                  if (group.type === "radio") {
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleRadioSelect(group.id, opt.id)}
                        className="w-full flex items-center gap-2 py-2 md:py-2.5 active:bg-accent rounded-full transition"
                      >
                        <div
                          className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "border-orange-500" : "border-border"
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-orange-500" />}
                        </div>
                        <span className="flex-1 text-left text-foreground text-xs md:text-sm">{opt.name}</span>
                        <span className="text-muted-foreground text-xs">+€ {opt.price.toFixed(2)}</span>
                      </button>
                    )
                  }

                  // Multi-select with quantity - show controls for optional items, or selected required items
                  const isOptional = !group.required
                  // For required groups, check total quantity, not number of different options
                  // For optional groups, can always add more
                  const currentTotalQty = getGroupTotalQuantity(group.id)
                  const canAddMore = isOptional || !group.maxSelect || currentTotalQty < group.maxSelect
                  
                  // For required groups, also check if we can increase quantity of selected items
                  const canIncreaseQty = isOptional || !group.required || !group.maxSelect || currentTotalQty < group.maxSelect
                  
                  return (
                    <div key={opt.id} className="flex items-center gap-1.5 md:gap-2 py-1.5">
                      {isOptional || isSelected ? (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => {
                              if (!isSelected && qty === 0) {
                                // First time selecting - add it
                                handleMultiSelect(group.id, opt.id, group.maxSelect)
                              } else {
                                // Decrease quantity
                                handleOptionQtyChange(opt.id, -1, group.id)
                              }
                            }}
                            disabled={!isSelected || qty === 0}
                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                              isSelected && qty > 0
                                ? "border-border text-muted-foreground hover:text-foreground hover:border-orange-500"
                                : "border-border/50 text-muted-foreground/50 cursor-not-allowed"
                            }`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected && qty > 0
                              ? "bg-orange-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {qty || 0}
                          </span>
                          <button
                            onClick={() => {
                              if (!isSelected) {
                                // First time selecting - add it
                                handleMultiSelect(group.id, opt.id, group.maxSelect)
                              } else {
                                // Increase quantity
                                handleOptionQtyChange(opt.id, 1, group.id)
                              }
                            }}
                            disabled={isSelected && !canIncreaseQty}
                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                              isSelected && !canIncreaseQty
                                ? "border-border/50 text-muted-foreground/50 cursor-not-allowed"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-orange-500"
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            // Double-check we can add more before calling handleMultiSelect
                            if (canAddMore) {
                              handleMultiSelect(group.id, opt.id, group.maxSelect)
                            }
                          }}
                          disabled={!canAddMore}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                            canAddMore
                              ? "border-border text-muted-foreground hover:border-orange-500 hover:text-orange-500"
                              : "border-border/50 text-muted-foreground/50 cursor-not-allowed"
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                      <span className="flex-1 text-foreground text-xs md:text-sm">{opt.name}</span>
                      <span className="text-muted-foreground text-xs">
                        +€ {opt.price.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

        </div>

        {/* Footer - Sticky */}
        <div className="p-3 md:p-3 bg-card rounded-b-3xl md:rounded-b-xl border-t border-border flex-shrink-0 sticky bottom-0 z-10 shadow-lg">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="flex items-center bg-muted rounded-full border border-border">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-2.5 md:px-3 py-2 md:py-2.5 text-muted-foreground hover:text-foreground active:bg-accent transition"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <span className="text-foreground font-bold text-sm md:text-base w-6 md:w-7 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)} 
                className="px-2.5 md:px-3 py-2 md:py-2.5 text-muted-foreground hover:text-foreground active:bg-accent transition"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>

            <button
              onClick={handleAddToBasket}
              disabled={!canAdd}
              className={`flex-1 flex items-center justify-between font-bold py-2.5 md:py-2.5 px-3 md:px-4 rounded-full transition text-xs md:text-sm ${
                canAdd 
                  ? "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white dark:bg-orange-600" 
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              <span>Add</span>
              <span>€ {itemTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
