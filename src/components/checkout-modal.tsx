"use client"

import { useState, useEffect } from "react"
import { X, Calendar, Clock, CreditCard, DollarSign, MapPin, Phone, FileText, ShoppingBag, Tag, User, ChevronRight, Info } from "lucide-react"
import { placeOrder, getCurrentUser, updateProfile, createCheckoutSession, getFees, calculateFees, getSettings, getActiveDiscounts, calculateDiscount, getAvailableDiscounts, type PlaceOrderData, type FeesData, type SettingsData, type DiscountData } from "@/lib/api"
import { useRouter } from "next/navigation"

interface BasketItem {
  id: number
  name: string
  price: string
  quantity: number
  totalPrice: number
  selectedSize?: {
    id: number
    size: string
    price: string | number
  }
  selectedOptions?: Array<{
    groupTitle: string
    items: Array<{ name: string; qty: number; price: number; id: number }>
  }>
  selectedAddOns?: Array<{
    id: number
    name: string
    price: number
    quantity?: number
  }>
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  items: BasketItem[]
  subtotal: number
  deliveryFee: number
  serviceFee: number
  total: number
  deliveryType: "delivery" | "collection"
  onOrderSuccess: () => void
}

export default function CheckoutModal({
  isOpen,
  onClose,
  items,
  subtotal: propSubtotal,
  deliveryFee: propDeliveryFee,
  serviceFee: propServiceFee,
  total: propTotal,
  deliveryType,
  onOrderSuccess,
}: CheckoutModalProps) {
  const router = useRouter()
  const user = getCurrentUser()
  const [feesData, setFeesData] = useState<FeesData | null>(null)
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null)
  const [discountsData, setDiscountsData] = useState<DiscountData[]>([])
  const [discountAmount, setDiscountAmount] = useState(0)
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountData | null>(null)
  const [availableDiscounts, setAvailableDiscounts] = useState<{ discount: DiscountData; meetsRequirement: boolean; amountNeeded: number }[]>([])
  
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [description, setDescription] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [voucherCode, setVoucherCode] = useState("")
  const [showDeliveryNotes, setShowDeliveryNotes] = useState(false)
  const [showOrderNotes, setShowOrderNotes] = useState(false)
  const [showVoucher, setShowVoucher] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [address, setAddress] = useState("")
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showItems, setShowItems] = useState(false)

  // Fetch fees, settings, and discounts data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fees, settings, discounts] = await Promise.all([
          getFees(),
          getSettings(),
          getActiveDiscounts(),
        ])
        setFeesData(fees)
        setSettingsData(settings)
        setDiscountsData(discounts)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }
    fetchData()
  }, [])

  // Calculate discount when subtotal, date, time, or discounts change
  useEffect(() => {
    if (selectedDate && selectedTime && discountsData.length > 0 && propSubtotal > 0) {
      const datePart = selectedDate.split(" - ")[0]
      const dateObj = new Date(datePart.split('/').reverse().join('-'))
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
      
      const discountResult = calculateDiscount(
        discountsData,
        propSubtotal,
        dayOfWeek
      )
      
      setDiscountAmount(discountResult.discountAmount)
      setAppliedDiscount(discountResult.discount)

      // Get all available discounts (including those user doesn't qualify for yet)
      const available = getAvailableDiscounts(discountsData, propSubtotal, dayOfWeek)
      setAvailableDiscounts(available)
    } else {
      setDiscountAmount(0)
      setAppliedDiscount(null)
      setAvailableDiscounts([])
    }
  }, [propSubtotal, selectedDate, selectedTime, discountsData])

  // Calculate fees dynamically
  const { deliveryFee, serviceFee, total } = calculateFees(feesData, propSubtotal, deliveryType, discountAmount)

  // Initialize form data
  useEffect(() => {
    if (isOpen && user) {
      const today = new Date()
      const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })
      setSelectedDate(`${dateStr} - Today`)
      
      const defaultTime = new Date(today.getTime() + 60 * 60 * 1000)
      const minutes = Math.ceil(defaultTime.getMinutes() / 15) * 15
      defaultTime.setMinutes(minutes)
      defaultTime.setSeconds(0)
      setSelectedTime(defaultTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }))
      
      setPhoneNumber(user.phone_number || "")
      setAddress((user as any).address || "")
      setError("")
    }
  }, [isOpen, user])

  // Generate time slots
  const generateTimeSlots = (): string[] => {
    const slots: string[] = []
    const now = new Date()
    const start = new Date(now)
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15)
    start.setSeconds(0)
    
    const end = new Date(now)
    end.setHours(23, 45, 0, 0)
    
    const current = new Date(start)
    while (current <= end) {
      slots.push(current.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }))
      current.setMinutes(current.getMinutes() + 15)
    }
    
    return slots
  }

  // Generate date options
  const generateDateOptions = (): Array<{ value: string; label: string }> => {
    const options: Array<{ value: string; label: string }> = []
    const today = new Date()
    
    for (let i = 0; i < 8; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })
      const label = i === 0 ? `${dateStr} - Today` : i === 1 ? `${dateStr} - Tomorrow` : `${dateStr} - ${date.toLocaleDateString("en-GB", { weekday: "long" })}`
      options.push({ value: `${dateStr} - ${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString("en-GB", { weekday: "long" })}`, label })
    }
    
    return options
  }

  const formatDateTime = () => {
    if (!selectedDate || !selectedTime) return ""
    const datePart = selectedDate.split(" - ")[0]
    const isToday = selectedDate.includes("Today")
    return isToday ? `Today, ${selectedTime}` : `${datePart}, ${selectedTime}`
  }

  const handleSavePhone = async () => {
    if (user && phoneNumber) {
      try {
        await updateProfile(user.id, {
          name: user.name,
          email: user.email,
          phone_number: phoneNumber,
          area_code: (user as any).area_code || "",
          latitude: (user as any).latitude || "",
          longitude: (user as any).longitude || "",
        })
        setIsEditingPhone(false)
      } catch (err) {
        setError("Failed to update phone number")
      }
    }
  }

  const handleSaveAddress = async () => {
    if (user && address) {
      try {
        await updateProfile(user.id, {
          name: user.name,
          email: user.email,
          phone_number: user.phone_number || "",
          area_code: (user as any).area_code || "",
          address: address,
          latitude: (user as any).latitude || "",
          longitude: (user as any).longitude || "",
        })
        setIsEditingAddress(false)
      } catch (err) {
        setError("Failed to update address")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!user) {
      setError("Please login to place an order")
      return
    }

    if (!phoneNumber) {
      setError("Phone number is required")
      return
    }

    if (!selectedDate || !selectedTime) {
      setError("Please select delivery date and time")
      return
    }

    // Validate minimum order value (only for delivery)
    if (deliveryType === "delivery" && settingsData && settingsData.min_order_value > 0 && propSubtotal < settingsData.min_order_value) {
      const minOrderValue = parseFloat(String(settingsData.min_order_value))
      setError(`Minimum order value is €${minOrderValue.toFixed(2)}. Your order total is €${propSubtotal.toFixed(2)}.`)
      setIsSubmitting(false)
      return
    }


    if (deliveryType === "delivery" && !address) {
      setError("Delivery address is required")
      return
    }

    if (!paymentMethod) {
      setError("Please select a payment method")
      return
    }

    setIsSubmitting(true)

    try {
      // Transform basket items to API format
      const orderItems = items.map((item) => {
        const attachments: Array<{ id: number; quantity: number }> = []

        if (item.selectedOptions) {
          item.selectedOptions.forEach((group) => {
            group.items.forEach((opt) => {
              if (opt.id) {
                attachments.push({
                  id: opt.id,
                  quantity: opt.qty,
                })
              }
            })
          })
        }

        if (item.selectedAddOns) {
          item.selectedAddOns.forEach((addon) => {
            attachments.push({
              id: addon.id,
              quantity: addon.quantity || 1,
            })
          })
        }

        return {
          food: item.id,
          quantity: item.quantity,
          size: item.selectedSize?.id,
          price: item.totalPrice / item.quantity,
          attachments: attachments.length > 0 ? attachments : undefined,
        }
      })

      // Combine description and delivery notes
      const fullDescription = [description, deliveryNotes].filter(Boolean).join(" | ") || undefined

      const orderData: PlaceOrderData = {
        total_price: total,
        customer: user.id,
        description: fullDescription,
        phone_number: phoneNumber,
        payment_method: paymentMethod === "cash" ? "cash" : "online",
        area_code: (user as any).area_code || "",
        houseadress: address || (user as any).address || user.name || "",
        longitude: String((user as any).longitude || "0"),
        latitude: String((user as any).latitude || "0"),
        date: selectedDate,
        time: selectedTime,
        delivery_type: deliveryType,
        order_items: orderItems,
      }

      // If online payment, redirect to Stripe checkout
      if (paymentMethod === "online") {
        const sessionData = await createCheckoutSession({
            order_data: orderData,
            items: items,
            subtotal: propSubtotal,
            deliveryFee,
            serviceFee,
            total,
        })
        
        if (sessionData.url) {
          // Redirect to Stripe checkout
          window.location.href = sessionData.url
          return
        } else {
          throw new Error("Failed to create payment session")
        }
      }

      // For cash on delivery, place order directly
      const response = await placeOrder(orderData)

      if (response.success) {
        localStorage.removeItem('basketItems')
        window.dispatchEvent(new Event('basketCleared'))
        onOrderSuccess()
        onClose()
        setTimeout(() => {
          router.push("/orders")
        }, 500)
      } else {
        setError(response.message || "Failed to place order")
      }
    } catch (err: any) {
      setError(err.message || "Failed to place order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl max-w-6xl w-full my-8 flex flex-col overflow-hidden shadow-2xl border border-border transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border flex-shrink-0">
          <h2 className="text-2xl font-bold text-foreground">Checkout</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition p-2 hover:bg-accent rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Two Column Layout */}
        <form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
          {/* Left Column - Order Details */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-gray-700">
            {/* Order Details Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Order details</h3>
              
              {/* Customer Name */}
              {user && (
                <div className="bg-muted rounded-lg p-4 mb-3 border border-border">
                  <div className="flex items-center gap-2 text-foreground mb-2">
                    <User className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">{user.name}</span>
                  </div>
                </div>
              )}

              {/* Phone Number */}
              <div className="bg-[#1a1a1a] rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-orange-500" />
                    <span className="text-foreground font-medium">Phone Number</span>
                    {!phoneNumber && (
                      <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded font-medium">Required</span>
                    )}
                  </div>
                  {!isEditingPhone ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(true)}
                      className="text-orange-500 hover:text-orange-400"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSavePhone}
                      className="text-green-500 hover:text-green-400 text-sm font-medium"
                    >
                      Save
                    </button>
                  )}
                </div>
                {isEditingPhone ? (
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full mt-2 px-3 py-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:border-orange-500"
                    required
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">{phoneNumber || "Not set"}</p>
                )}
              </div>

              {/* Address */}
              {deliveryType === "delivery" && (
                <div className="bg-[#1a1a1a] rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-orange-500" />
                      <span className="text-foreground font-medium">Address</span>
                      {!address && (
                        <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded font-medium">Required</span>
                      )}
                    </div>
                    {!isEditingAddress ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(true)}
                        className="text-orange-500 hover:text-orange-400"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveAddress}
                        className="text-green-500 hover:text-green-400 text-sm font-medium"
                      >
                        Save
                      </button>
                    )}
                  </div>
                  {isEditingAddress ? (
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter delivery address"
                      rows={2}
                      className="w-full mt-2 px-3 py-2 bg-[#2a2a2a] text-white rounded-lg border border-gray-700 focus:outline-none focus:border-orange-500 resize-none"
                      required
                    />
                  ) : (
                    <p className="text-gray-300 text-sm">{address || "Not set"}</p>
                  )}
                </div>
              )}

              {/* Collection/Delivery Time */}
              <div className="bg-[#1a1a1a] rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <span className="text-white font-medium">
                      {deliveryType === "delivery" ? "Delivery time" : "Collection time"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="text-orange-500 hover:text-orange-400"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 bg-[#2a2a2a] text-white rounded-lg border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
                    required
                  >
                    {generateDateOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="px-3 py-2 bg-[#2a2a2a] text-white rounded-lg border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
                    required
                  >
                    {generateTimeSlots().map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                    <p className="text-muted-foreground text-sm mt-2">{formatDateTime()}</p>
              </div>

              {/* Delivery Notes */}
              {deliveryType === "delivery" && (
                <div className="bg-[#1a1a1a] rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-500" />
                      <span className="text-foreground font-medium">Add delivery notes</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeliveryNotes(!showDeliveryNotes)}
                      className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600"
                    >
                      <span className="text-lg">{showDeliveryNotes ? "-" : "+"}</span>
                    </button>
                  </div>
                  {showDeliveryNotes && (
                    <textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Add delivery instructions..."
                      rows={3}
                      className="w-full mt-2 px-3 py-2 bg-[#2a2a2a] text-white rounded-lg border border-gray-700 focus:outline-none focus:border-orange-500 resize-none"
                    />
                  )}
                  {!showDeliveryNotes && deliveryNotes && (
                    <p className="text-muted-foreground text-sm mt-2">{deliveryNotes}</p>
                  )}
                </div>
              )}

              {/* Order Notes */}
              <div className="bg-[#1a1a1a] rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-orange-500" />
                      <span className="text-foreground font-medium">Add order notes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOrderNotes(!showOrderNotes)}
                    className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600"
                  >
                    <span className="text-lg">{showOrderNotes ? "-" : "+"}</span>
                  </button>
                </div>
                {showOrderNotes && (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add order notes..."
                    rows={3}
                    className="w-full mt-2 px-3 py-2 bg-[#2a2a2a] text-white rounded-lg border border-gray-700 focus:outline-none focus:border-orange-500 resize-none"
                  />
                )}
                {!showOrderNotes && description && (
                  <p className="text-muted-foreground text-sm mt-2">{description}</p>
                )}
              </div>
            </div>

            {/* Payment Options Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Payment options</h3>
              
              {/* Payment Method */}
              <div className="bg-[#1a1a1a] rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-orange-500" />
                    <span className="text-foreground font-medium">Select payment method</span>
                    {!paymentMethod && (
                      <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded font-medium">Required</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="text-orange-500 hover:text-orange-400"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                      paymentMethod === "cash"
                        ? "border-orange-500 bg-orange-500/10 text-orange-500"
                        : "border-border bg-card text-muted-foreground hover:border-orange-500/50"
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span className="font-medium">Cash on delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("online")}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                      paymentMethod === "online"
                        ? "border-orange-500 bg-orange-500/10 text-orange-500"
                        : "border-border bg-card text-muted-foreground hover:border-orange-500/50"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">Online</span>
                  </button>
                </div>
              </div>

              {/* Voucher */}
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-orange-500" />
                    <span className="text-foreground font-medium">Add voucher</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVoucher(!showVoucher)}
                    className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600"
                  >
                    <span className="text-lg">{showVoucher ? "-" : "+"}</span>
                  </button>
                </div>
                {showVoucher && (
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Enter voucher code"
                    className="w-full mt-2 px-3 py-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:border-orange-500"
                  />
                )}
                {!showVoucher && voucherCode && (
                  <p className="text-muted-foreground text-sm mt-2">{voucherCode}</p>
                )}
              </div>
            </div>

            {/* Marketing Opt-in */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="marketing"
                className="mt-1 w-4 h-4 rounded border-border bg-background text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="marketing" className="text-foreground text-sm">
                We'll send you emails, SMS or push messages to tell you about great Just Eat deals and services. If you'd rather we didn't, check the box.
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="w-96 bg-muted overflow-y-auto p-6 flex flex-col border-l border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Order summary</h3>
            
            {/* Restaurant Name */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-foreground font-medium">Oscar's Pizza & Kebab</span>
            </div>

            {/* Items */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowItems(!showItems)}
                className="text-orange-500 hover:text-orange-400 text-sm font-medium mb-2"
              >
                {showItems ? "Hide" : "Show"} {items.length} {items.length === 1 ? "item" : "items"}
              </button>
              {showItems && (
                <div className="space-y-2 mt-2">
                  {items.map((item, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {item.quantity}x {item.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 mb-4 pb-4 border-b border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">€ {propSubtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && appliedDiscount && (
                <div className="flex justify-between text-sm">
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

              {/* Show available discounts user doesn't qualify for yet */}
              {availableDiscounts.length > 0 && availableDiscounts.some(ad => !ad.meetsRequirement) && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2 space-y-1">
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    💡 Available Discounts
                  </div>
                  {availableDiscounts
                    .filter(ad => !ad.meetsRequirement)
                    .map((availableDiscount, idx) => (
                      <div key={idx} className="text-xs text-blue-600 dark:text-blue-400">
                        <span className="font-medium">{availableDiscount.discount.name}</span>
                        {' - '}
                        {availableDiscount.discount.discount_type === 'percentage' 
                          ? `${typeof availableDiscount.discount.discount_value === 'number' ? availableDiscount.discount.discount_value : parseFloat(String(availableDiscount.discount.discount_value)) || 0}% off`
                          : `€${(typeof availableDiscount.discount.discount_value === 'number' ? availableDiscount.discount.discount_value : parseFloat(String(availableDiscount.discount.discount_value)) || 0).toFixed(2)} off`
                        }
                        {' when you spend €'}
                        {availableDiscount.discount.minimum_purchase_amount?.toFixed(2) || '0.00'}
                        {availableDiscount.amountNeeded > 0 && (
                          <span className="font-semibold text-blue-700 dark:text-blue-300 ml-1">
                            (Spend €{availableDiscount.amountNeeded.toFixed(2)} more)
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
              {deliveryType === "delivery" && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Delivery fee <Info className="w-3 h-3" />
                    {deliveryFee === 0 && feesData && propSubtotal >= parseFloat(feesData.free_delivery_limit) && (
                      <span className="text-green-500 text-xs">(Free!)</span>
                    )}
                  </span>
                  <span className="text-foreground">
                    {deliveryFee === 0 ? "Free" : `€ ${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  Service fee <Info className="w-3 h-3" />
                </span>
                <span className="text-foreground">€ {serviceFee.toFixed(2)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between mb-6">
              <span className="text-foreground font-bold text-lg">Total</span>
              <span className="text-foreground font-bold text-lg">€ {total.toFixed(2)}</span>
            </div>

            {/* Minimum Order Warning - Only for delivery */}
            {deliveryType === "delivery" && settingsData && settingsData.min_order_value > 0 && propSubtotal < settingsData.min_order_value && (
              <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-2 mb-4">
                <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                  Minimum order value: €{parseFloat(String(settingsData.min_order_value)).toFixed(2)}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition text-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4 dark:bg-orange-600"
            >
              {isSubmitting ? "Processing..." : "Order and pay"}
            </button>

            {/* Legal Disclaimer */}
            <p className="text-muted-foreground text-xs text-center">
              By selecting Order and pay you agree with the contents of your order, the data provided, our{" "}
              <a href="#" className="text-orange-500 hover:underline">privacy statement</a> and{" "}
              <a href="#" className="text-orange-500 hover:underline">terms of use</a>.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
