"use client"

import { ShoppingCart, Trash2, Minus, Plus, Bike, ShoppingBag, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getFees, calculateFees, type FeesData } from "@/lib/api"

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

interface BasketSidebarProps {
  items: BasketItem[]
  onUpdateQuantity: (index: number, newQty: number) => void
  onRemoveItem: (index: number) => void
  onItemClick?: (productId: number) => void
}

export default function BasketSidebar({ items, onUpdateQuantity, onRemoveItem, onItemClick }: BasketSidebarProps) {
  const router = useRouter()
  // Initialize with default value to avoid hydration mismatch
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "collection">("delivery")
  const [feesData, setFeesData] = useState<FeesData | null>(null)

  // Fetch fees data on mount
  useEffect(() => {
    const fetchFees = async () => {
      try {
        const fees = await getFees()
        setFeesData(fees)
      } catch (error) {
        console.error('Failed to fetch fees:', error)
      }
    }
    fetchFees()
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
  const { deliveryFee, serviceFee, total } = calculateFees(feesData, subtotal, deliveryMode)
  
  // Get free delivery limit with fallback
  const freeDeliveryLimit = feesData ? parseFloat(feesData.free_delivery_limit) : 12.0
  const qualifiesForFreeDelivery = subtotal >= freeDeliveryLimit
  const amountNeeded = Math.max(0, freeDeliveryLimit - subtotal)

  return (
    <div className="flex flex-col w-full h-full bg-background border-l border-border overflow-y-auto transition-colors duration-300">
      <div className="p-6 pb-4">
        <h2 className="text-2xl font-bold text-foreground text-center mb-6">Basket</h2>

        <div className="flex bg-card rounded-full p-1 mb-4">
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
            <Bike
              className={`w-5 h-5 ${
                deliveryMode === "delivery" ? "text-orange-500" : ""
              }`}
            />
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
            <ShoppingBag
              className={`w-5 h-5 ${
                deliveryMode === "collection" ? "text-orange-500" : ""
              }`}
            />
            <span className="font-medium">Collection</span>
          </button>
        </div>

        {/* Free Delivery Message */}
        {deliveryMode === "delivery" && (
          <div className="mb-4 px-3 py-2 rounded-lg text-xs sm:text-sm border border-border bg-card min-h-[3.5rem] flex items-center">
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

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 flex-1">
          <ShoppingCart className="w-14 h-14 text-muted-foreground mb-4" strokeWidth={1.5} />
          <p className="text-xl font-bold text-foreground mb-2">Fill your basket</p>
          <p className="text-muted-foreground text-center text-sm">Your basket is empty</p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 px-4">
          <div className="flex-1 space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border-b border-border pb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 
                    className="text-foreground font-bold underline cursor-pointer hover:text-orange-500 transition"
                    onClick={() => onItemClick && item.id && onItemClick(item.id)}
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
                      className="px-3 py-2 text-muted-foreground hover:text-foreground"
                    >
                      {item.quantity <= 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </button>
                    <span className="text-foreground font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                      className="px-3 py-2 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 pb-4 space-y-3 mt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">€ {subtotal.toFixed(2)}</span>
            </div>
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
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <span className="text-foreground font-bold">Total</span>
              <span className="text-foreground font-bold">€ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="pb-6">
            <button 
              onClick={() => router.push('/checkout')}
              className="w-full bg-orange-500 text-white font-bold py-4 rounded-full hover:bg-orange-600 transition text-lg dark:bg-orange-600"
            >
              Checkout (€ {total.toFixed(2)})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
