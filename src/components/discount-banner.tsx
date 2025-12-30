"use client"

import { useState, useEffect } from "react"
import { Tag, X, Clock } from "lucide-react"
import { getActiveDiscounts, type DiscountData } from "@/lib/api"

export default function DiscountBanner() {
  const [discounts, setDiscounts] = useState<DiscountData[]>([])
  const [currentDiscount, setCurrentDiscount] = useState<DiscountData | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const activeDiscounts = await getActiveDiscounts()
        setDiscounts(activeDiscounts)
        
        // Find applicable discount for today
        if (activeDiscounts.length > 0) {
          const now = new Date()
          const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
          
          // Check which discount applies today
          for (const discount of activeDiscounts) {
            // Check day of week - if no days specified, applies to all days
            let isValidDay = true
            if (discount.days_of_week && discount.days_of_week.length > 0) {
              const days = discount.days_of_week.map(d => d.toLowerCase())
              if (!days.includes(dayOfWeek.toLowerCase())) {
                isValidDay = false
              }
            }
            
            if (isValidDay) {
              setCurrentDiscount(discount)
              break
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch discounts:', error)
      }
    }
    
    fetchDiscounts()
  }, [])

  if (!isVisible || !currentDiscount) {
    return null
  }

  // Ensure discount_value is a number
  const discountValue = typeof currentDiscount.discount_value === 'number' 
    ? currentDiscount.discount_value 
    : parseFloat(String(currentDiscount.discount_value)) || 0

  // Format discount value display
  const discountDisplay = currentDiscount.discount_type === 'percentage'
    ? `${discountValue}%`
    : `€${discountValue.toFixed(2)}`

  const getDiscountDescription = () => {
    const parts: string[] = []
    
    // Add day information
    if (currentDiscount.days_of_week && currentDiscount.days_of_week.length > 0) {
      const days = currentDiscount.days_of_week.map(d => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase())
      if (days.length === 7) {
        parts.push("Every day")
      } else {
        parts.push(days.join(", "))
      }
    } else {
      parts.push("Every day")
    }
    
    // Add minimum purchase requirement if exists
    if (currentDiscount.minimum_purchase_amount && currentDiscount.minimum_purchase_amount > 0) {
      const minAmount = typeof currentDiscount.minimum_purchase_amount === 'number' 
        ? currentDiscount.minimum_purchase_amount 
        : parseFloat(String(currentDiscount.minimum_purchase_amount)) || 0
      if (minAmount > 0) {
        parts.push(`Min. purchase: €${minAmount.toFixed(2)}`)
      }
    }
    
    return parts.join(" • ")
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Tag className="w-5 h-5 flex-shrink-0 opacity-90" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-bold text-lg sm:text-xl tracking-tight">
                  {discountDisplay} OFF
                </span>
                <span className="text-sm sm:text-base font-medium text-white/95">
                  {currentDiscount.name}
                </span>
              </div>
              {getDiscountDescription() && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0 opacity-75" />
                  <span className="text-xs sm:text-sm text-white/85 font-normal">
                    {getDiscountDescription()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-md transition-colors duration-200"
            aria-label="Close discount banner"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
