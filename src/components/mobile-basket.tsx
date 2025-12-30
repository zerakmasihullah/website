"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, ShoppingCart, Trash2, Minus, Plus, Bike, ShoppingBag, Info } from "lucide-react"
import { getFees, calculateFees, getActiveDiscounts, calculateDiscount, type FeesData, type DiscountData } from "@/lib/api"

interface SelectedOption {
  groupTitle: string
  items: { name: string; qty: number; price: number; id: number }[]
}

interface SelectedAddOn {
  id: number
  name: string
  price: number
  quantity?: number
}

interface BasketItem {
  id: number
  name: string
  price: string
  quantity: number
  totalPrice: number
  selectedOptions?: SelectedOption[]
  selectedAddOns?: SelectedAddOn[]
}

interface MobileBasketProps {
  items: BasketItem[]
  onUpdateQuantity: (index: number, newQty: number) => void
  onRemoveItem: (index: number) => void
  onItemClick?: (productId: number) => void
}

export default function MobileBasket({ items, onUpdateQuantity, onRemoveItem, onItemClick }: MobileBasketProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  // Initialize with default value to avoid hydration mismatch
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "collection">("delivery")
  const [feesData, setFeesData] = useState<FeesData | null>(null)
  const [discountsData, setDiscountsData] = useState<DiscountData[]>([])
  const [discountAmount, setDiscountAmount] = useState(0)
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountData | null>(null)

  // Fetch fees and discounts data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fees, discounts] = await Promise.all([
          getFees(),
          getActiveDiscounts()
        ])
        setFeesData(fees)
        setDiscountsData(discounts)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }
    fetchData()
  }, [])

  // Sync with localStorage changes (e.g., when coming back from checkout)
  useEffect(() => {
    const syncDeliveryMode = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('deliveryType')
        if (saved === "collection" || saved === "delivery") {
          setDeliveryMode(saved as "delivery" | "collection")
        }
      }
    }

    // Sync on mount (after hydration)
    syncDeliveryMode()

    // Listen for custom delivery mode change event
    const handleDeliveryModeChange = () => syncDeliveryMode()
    window.addEventListener('deliveryModeChanged', handleDeliveryModeChange)
    
    // Listen for storage events (cross-tab)
    const handleStorage = () => syncDeliveryMode()
    window.addEventListener('storage', handleStorage)
    
    // Also check on focus/visibility change (same-tab navigation)
    const handleFocus = () => syncDeliveryMode()
    const handleVisibility = () => {
      if (!document.hidden) {
        syncDeliveryMode()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    
    // Listen for popstate when navigating back
    const handlePopState = () => {
      setTimeout(syncDeliveryMode, 100)
    }
    window.addEventListener('popstate', handlePopState)
    
    // Periodic check for same-tab localStorage changes (only when visible)
    const interval = setInterval(() => {
      if (!document.hidden) {
        syncDeliveryMode()
      }
    }, 200)
    
    return () => {
      window.removeEventListener('deliveryModeChanged', handleDeliveryModeChange)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('popstate', handlePopState)
      clearInterval(interval)
    }
  }, [])

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)

  // Calculate discount based on today's day of week
  useEffect(() => {
    if (discountsData.length > 0 && subtotal > 0) {
      const now = new Date()
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
      
      const discountResult = calculateDiscount(
        discountsData,
        subtotal,
        dayOfWeek
      )
      
      setDiscountAmount(discountResult.discountAmount)
      setAppliedDiscount(discountResult.discount)
    } else {
      setDiscountAmount(0)
      setAppliedDiscount(null)
    }
  }, [subtotal, discountsData])

  const { deliveryFee, serviceFee, total } = calculateFees(feesData, subtotal, deliveryMode, discountAmount)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  
  // Get free delivery limit with fallback
  const freeDeliveryLimit = feesData ? parseFloat(feesData.free_delivery_limit) : 12.0
  const qualifiesForFreeDelivery = subtotal >= freeDeliveryLimit
  const amountNeeded = Math.max(0, freeDeliveryLimit - subtotal)

  // Get minimum order value
  const minOrderValue = feesData?.min_order 
    ? parseFloat(String(feesData.min_order)) 
    : 10.0
  
  // Check if order meets minimum requirement (only for delivery)
  const meetsMinimumOrder = deliveryMode === "collection" || subtotal >= minOrderValue
  const minOrderAmountNeeded = deliveryMode === "delivery" ? Math.max(0, minOrderValue - subtotal) : 0

  const handleCheckout = () => {
    // Validate minimum order for delivery
    if (deliveryMode === "delivery" && subtotal < minOrderValue) {
      alert(`Minimum order value for delivery is €${minOrderValue.toFixed(2)}. Your order total is €${subtotal.toFixed(2)}. Please add €${minOrderAmountNeeded.toFixed(2)} more to proceed.`)
      return
    }
    setIsOpen(false)
    router.push('/checkout')
  }

  if (items.length === 0) return null

  return (
    <>
      {/* Floating Basket Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 right-4 lg:hidden z-40 bg-orange-500 text-white font-bold py-4 px-6 rounded-full shadow-lg hover:bg-orange-600 transition flex items-center justify-between dark:bg-orange-600"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-orange-500 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <span>Basket (€ {total.toFixed(2)})</span>
        </div>
        <span className="text-lg">→</span>
      </button>

      {/* Mobile Basket Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl h-[90vh] flex flex-col overflow-hidden border-t border-border shadow-2xl transition-colors duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-border flex-shrink-0">
              <h2 className="text-xl font-bold text-foreground">Basket</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition p-2 hover:bg-accent rounded-full -mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Delivery/Collection Toggle */}
            <div className="p-4 border-b border-border flex-shrink-0">
              <div className="flex bg-card rounded-full p-1 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    const newMode: "delivery" | "collection" = "delivery"
                    localStorage.setItem('deliveryType', 'delivery')
                    setDeliveryMode(newMode)
                    // Force update
                    window.dispatchEvent(new Event('deliveryModeChanged'))
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-full text-sm transition ${
                      deliveryMode === "delivery" ? "bg-accent text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Bike className={`w-5 h-5 ${deliveryMode === "delivery" ? "text-orange-500" : ""}`} />
                  <span className="font-medium">Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newMode: "delivery" | "collection" = "collection"
                    localStorage.setItem('deliveryType', 'collection')
                    setDeliveryMode(newMode)
                    // Force update
                    window.dispatchEvent(new Event('deliveryModeChanged'))
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-full text-sm transition ${
                      deliveryMode === "collection" ? "bg-accent text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <ShoppingBag className={`w-5 h-5 ${deliveryMode === "collection" ? "text-orange-500" : ""}`} />
                  <span className="font-medium">Collection</span>
                </button>
              </div>

              {/* Free Delivery Message */}
              {deliveryMode === "delivery" && (
                <div className="px-3 py-2 rounded-lg text-xs border border-border bg-card min-h-[3.5rem] flex items-center">
                  {qualifiesForFreeDelivery ? (
                    <p className="text-green-500 font-medium flex items-center gap-1">
                      <span>✓</span>
                      <span>You qualify for free delivery!</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Free delivery on orders over €{freeDeliveryLimit.toFixed(2)}</span>
                      <br />
                      <span className="text-orange-500">Add €{amountNeeded.toFixed(2)} more for free delivery</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Basket Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border-b border-border pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 
                        className="text-foreground font-bold underline cursor-pointer flex-1 pr-2 hover:text-orange-500 transition"
                        onClick={() => {
                          if (onItemClick && item.id) {
                            onItemClick(item.id)
                            setIsOpen(false)
                          }
                        }}
                      >
                        {item.name}
                        {(item as any).selectedSize && ` (${(item as any).selectedSize.size || (item as any).selectedSize.name})`}
                      </h3>
                      <span className="text-foreground font-medium">
                        {(() => {
                          // If price is null/undefined and item has selectedSize, show size-based price
                          if ((!item.price || item.price === 'null' || item.price === null) && (item as any).selectedSize) {
                            const sizePrice = typeof (item as any).selectedSize.price === 'number' 
                              ? (item as any).selectedSize.price 
                              : parseFloat(String((item as any).selectedSize.price || 0))
                            return `€ ${(sizePrice * item.quantity).toFixed(2)}`
                          }
                          // Otherwise show totalPrice
                          return `€ ${item.totalPrice.toFixed(2)}`
                        })()}
                      </span>
                    </div>

                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="text-muted-foreground text-sm space-y-0.5 mb-2">
                        {item.selectedOptions.map((group, gIdx) =>
                          group.items.map((opt, oIdx) => (
                            <p key={`${gIdx}-${oIdx}`}>
                              {opt.qty > 1 ? `${opt.qty} x ` : ""}
                              {opt.name}
                            </p>
                          )),
                        )}
                      </div>
                    )}

                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="text-muted-foreground text-sm space-y-0.5 mb-2">
                        {item.selectedAddOns.map((addon, aIdx) => (
                          <p key={aIdx}>
                            {addon.quantity && addon.quantity > 1 ? `${addon.quantity} x ` : ""}
                            {addon.name}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end items-center mt-3">
                      <div className="flex items-center bg-card rounded-full border border-border">
                        <button
                          onClick={() =>
                            item.quantity <= 1 ? onRemoveItem(index) : onUpdateQuantity(index, item.quantity - 1)
                          }
                          className="px-3 py-2 text-muted-foreground hover:text-foreground active:bg-accent"
                        >
                          {item.quantity <= 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </button>
                        <span className="text-foreground font-bold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                          className="px-3 py-2 text-muted-foreground hover:text-foreground active:bg-accent"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer with Total and Checkout */}
            <div className="border-t border-border bg-background flex-shrink-0">
              <div className="px-4 pt-4 pb-2 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">€ {subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && appliedDiscount && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      Discount {appliedDiscount.name && `(${appliedDiscount.name})`}
                      {appliedDiscount.discount_type === 'percentage' 
                        ? ` (${typeof appliedDiscount.discount_value === 'number' ? appliedDiscount.discount_value : parseFloat(String(appliedDiscount.discount_value)) || 0}%)`
                        : ` (€${(typeof appliedDiscount.discount_value === 'number' ? appliedDiscount.discount_value : parseFloat(String(appliedDiscount.discount_value)) || 0).toFixed(2)})`
                      }
                      {appliedDiscount.minimum_purchase_amount && appliedDiscount.minimum_purchase_amount > 0 && (
                        <span className="text-xs opacity-75">• Min: €{appliedDiscount.minimum_purchase_amount.toFixed(2)}</span>
                      )}
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      -€ {discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {deliveryMode === "delivery" && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Delivery fee <Info className="w-3 h-3" />
                      {deliveryFee === 0 && feesData && subtotal >= parseFloat(feesData.free_delivery_limit) && (
                        <span className="text-green-500 text-xs">(Free!)</span>
                      )}
                    </span>
                    <span className="text-foreground">
                      {deliveryFee === 0 ? "Free" : `€ ${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Service fee <Info className="w-3 h-3" />
                  </span>
                  <span className="text-foreground">€ {serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border pb-4">
                  <span className="text-foreground font-bold text-lg">Total</span>
                  <span className="text-foreground font-bold text-lg">€ {total.toFixed(2)}</span>
                </div>
              </div>
              {/* Minimum Order Warning */}
              {deliveryMode === "delivery" && !meetsMinimumOrder && (
                <div className="px-4 pb-3">
                  <div className="px-3 py-2 rounded-lg text-xs border border-orange-500/50 bg-orange-500/10">
                    <p className="text-orange-500 font-medium">
                      Minimum order for delivery is €{minOrderValue.toFixed(2)}. Add €{minOrderAmountNeeded.toFixed(2)} more to checkout.
                    </p>
                  </div>
                </div>
              )}
              <div className="px-4 pb-6">
                <button 
                  onClick={handleCheckout}
                  disabled={!meetsMinimumOrder && deliveryMode === "delivery"}
                  className={`w-full font-bold py-4 rounded-full transition text-lg ${
                    (!meetsMinimumOrder && deliveryMode === "delivery")
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 dark:bg-orange-600"
                  }`}
                >
                  Checkout (€ {total.toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

