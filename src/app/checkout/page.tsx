"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, Clock, CreditCard, MapPin, Phone, ShoppingBag, User, ChevronRight, Info, ArrowLeft, Bike } from "lucide-react"
import { placeOrder, getCurrentUser, updateProfile, createCheckoutSession, validateUserSession, isAuthenticated, type PlaceOrderData } from "@/lib/api"
import Header from "@/components/header"
import MyAccountModal from "@/components/my-account-modal"
import dynamic from "next/dynamic"

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import("@/components/location-picker"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-[#1a1a1a] rounded-xl border border-gray-700 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading map...</div>
    </div>
  ),
})

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  const [items, setItems] = useState<any[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [serviceFee, setServiceFee] = useState(0.99)
  const [total, setTotal] = useState(0)
  // Initialize with default value to avoid hydration mismatch
  const [deliveryType, setDeliveryType] = useState<"delivery" | "collection">("delivery")
  
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [description, setDescription] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [areaCode, setAreaCode] = useState("")
  const [address, setAddress] = useState("")
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [isEditingAreaCode, setIsEditingAreaCode] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [checkoutLatitude, setCheckoutLatitude] = useState("")
  const [checkoutLongitude, setCheckoutLongitude] = useState("")
  const [showMap, setShowMap] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showItems, setShowItems] = useState(false)
  const [showOrderNotes, setShowOrderNotes] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const session = validateUserSession()
      if (session.valid && session.user) {
        setUser(session.user)
        setIsAccountModalOpen(false)
      } else {
        setUser(null)
        setIsAccountModalOpen(true)
        setError("Please login or create an account to proceed with checkout.")
      }
      setIsCheckingAuth(false)
    }
    
    checkAuth()
    
    // Listen for auth events
    const handleAuthChange = () => {
      checkAuth()
    }
    
    window.addEventListener('auth:login', handleAuthChange)
    window.addEventListener('auth:logout', handleAuthChange)
    
    return () => {
      window.removeEventListener('auth:login', handleAuthChange)
      window.removeEventListener('auth:logout', handleAuthChange)
    }
  }, [])

  // Load basket items and delivery type from localStorage (after hydration)
  useEffect(() => {
    // Load delivery type first
    if (typeof window !== 'undefined') {
      const savedDeliveryType = localStorage.getItem('deliveryType')
      if (savedDeliveryType === "collection" || savedDeliveryType === "delivery") {
        setDeliveryType(savedDeliveryType as "delivery" | "collection")
      }
    }

    // Load basket items
    try {
      if (typeof window !== 'undefined') {
        const savedBasket = localStorage.getItem('basketItems')
        if (savedBasket) {
          const parsed = JSON.parse(savedBasket)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed)
            const sub = parsed.reduce((sum: number, item: any) => sum + item.totalPrice, 0)
            setSubtotal(sub)
            const savedDeliveryType = localStorage.getItem('deliveryType')
            const delivery = (savedDeliveryType === "collection" ? 0 : 3.0)
            setDeliveryFee(delivery)
            setTotal(sub + delivery + serviceFee)
          } else {
            // Basket is empty, redirect to home
            router.push('/')
          }
        } else {
          // No basket, redirect to home
          router.push('/')
        }
      }
    } catch (error) {
      router.push('/')
    }
  }, [router])

  // Update totals when delivery type changes
  useEffect(() => {
    const delivery = deliveryType === "delivery" ? 3.0 : 0
    setDeliveryFee(delivery)
    setTotal(subtotal + delivery + serviceFee)
  }, [deliveryType, subtotal, serviceFee])

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: string, lng: string): Promise<string> => {
    try {
      // Use OpenStreetMap Nominatim API (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'OscarWebsite/1.0' // Required by Nominatim
          }
        }
      )
      const data = await response.json()
      if (data && data.display_name) {
        return data.display_name
      }
    } catch (error) {
    }
    return ""
  }

  // Initialize form data
  useEffect(() => {
    if (user) {
      const today = new Date()
      const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })
      setSelectedDate(`${dateStr} - Today`)
      
      const defaultTime = new Date(today.getTime() + 60 * 60 * 1000)
      const minutes = Math.ceil(defaultTime.getMinutes() / 15) * 15
      defaultTime.setMinutes(minutes)
      defaultTime.setSeconds(0)
      setSelectedTime(defaultTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }))
      
      setPhoneNumber(user.phone_number || "")
      setAreaCode((user as any).area_code || "")
      
      // Initialize coordinates from user profile
      const lat = (user as any).latitude || ""
      const lng = (user as any).longitude || ""
      setCheckoutLatitude(lat)
      setCheckoutLongitude(lng)
      
      // Initialize address: Priority 1) Profile address, 2) localStorage, 3) Reverse geocode from coordinates
      const profileAddress = (user as any).address || ""
      const savedAddress = localStorage.getItem('user_address') || ""
      
      if (profileAddress) {
        // Use profile address as default
        setAddress(profileAddress)
        localStorage.setItem('user_address', profileAddress)
      } else if (savedAddress) {
        // Use saved address from previous checkout
        setAddress(savedAddress)
      } else if (lat && lng && lat !== "0" && lng !== "0" && parseFloat(lat) !== 0 && parseFloat(lng) !== 0) {
        // Reverse geocode from profile coordinates
        reverseGeocode(lat, lng).then((geocodedAddress) => {
          if (geocodedAddress) {
            setAddress(geocodedAddress)
            localStorage.setItem('user_address', geocodedAddress)
          }
        })
      }
      
      // Show map if coordinates exist
      if (lat && lng && lat !== "0" && lng !== "0") {
        setShowMap(true)
      }
    }
  }, [user])

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
    if (!user) {
      setError("Please login first")
      setIsAccountModalOpen(true)
      return
    }
    
    if (!phoneNumber || phoneNumber.trim() === "") {
      setError("Phone number is required")
      return
    }
    
    try {
      const updatedUser = await updateProfile(user.id, {
        name: user.name,
        email: user.email,
        phone_number: phoneNumber,
        area_code: areaCode || (user as any).area_code || "",
        latitude: (user as any).latitude || "",
        longitude: (user as any).longitude || "",
      })
      
      // Refresh user data
      const currentUser = getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
      }
      setIsEditingPhone(false)
      setError("")
    } catch (err: any) {
      if (err.message && err.message.includes('Session expired')) {
        setError("Session expired. Please login again.")
        setIsAccountModalOpen(true)
        setUser(null)
      } else {
        setError(err.message || "Failed to update phone number")
      }
    }
  }

  const handleSaveAreaCode = async () => {
    if (!user) {
      setError("Please login first")
      setIsAccountModalOpen(true)
      return
    }
    
    if (!areaCode || areaCode.trim() === "") {
      setError("Area code is required")
      return
    }
    
    try {
      const updatedUser = await updateProfile(user.id, {
        name: user.name,
        email: user.email,
        phone_number: phoneNumber || user.phone_number || "",
        area_code: areaCode,
        latitude: (user as any).latitude || "",
        longitude: (user as any).longitude || "",
      })
      
      // Refresh user data
      const currentUser = getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
      }
      setIsEditingAreaCode(false)
      setError("")
    } catch (err: any) {
      if (err.message && err.message.includes('Session expired')) {
        setError("Session expired. Please login again.")
        setIsAccountModalOpen(true)
        setUser(null)
      } else {
        setError(err.message || "Failed to update area code")
      }
    }
  }

  const handleSaveAddress = () => {
    if (address && address.trim()) {
      // Save address to localStorage for this checkout session only (not to user profile, as it's per-order)
      localStorage.setItem('user_address', address.trim())
      setIsEditingAddress(false)
      setError("") // Clear any previous errors
      // Note: We intentionally do NOT update the user profile here
      // The checkout address is only for this specific order
    } else if (checkoutLatitude && checkoutLongitude && checkoutLatitude !== "0" && checkoutLongitude !== "0") {
      // If no address but coordinates exist, use coordinates
      setAddress(`Location: ${checkoutLatitude}, ${checkoutLongitude}`)
      localStorage.setItem('user_address', `Location: ${checkoutLatitude}, ${checkoutLongitude}`)
      setIsEditingAddress(false)
      setError("")
    } else {
      setError("Please enter a valid address or select location on map")
      setShowMap(true)
    }
  }

  const handleLocationChange = (lat: string, lng: string) => {
    setCheckoutLatitude(lat)
    setCheckoutLongitude(lng)
    setShowMap(true)
    setError("") // Clear any errors
    // Try to reverse geocode the new location
    reverseGeocode(lat, lng).then((geocodedAddress) => {
      if (geocodedAddress) {
        setAddress(geocodedAddress)
        localStorage.setItem('user_address', geocodedAddress)
      } else {
        // If reverse geocoding fails, set address with coordinates
        setAddress(`Location: ${lat}, ${lng}`)
        localStorage.setItem('user_address', `Location: ${lat}, ${lng}`)
      }
    }).catch(() => {
      // Fallback if reverse geocoding fails
      setAddress(`Location: ${lat}, ${lng}`)
      localStorage.setItem('user_address', `Location: ${lat}, ${lng}`)
    })
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate session
    const session = validateUserSession()
    if (!session.valid || !session.user) {
      setError("Please login or create an account to place an order.")
      setIsAccountModalOpen(true)
      setUser(null)
      return
    }
    
    // Update user from session
    setUser(session.user)

    if (!phoneNumber || phoneNumber.trim() === "") {
      setError("Phone number is required")
      setIsEditingPhone(true)
      return
    }

    if (!areaCode || areaCode.trim() === "") {
      setError("Area code is required")
      setIsEditingAreaCode(true)
      return
    }

    if (!selectedDate || !selectedTime) {
      setError("Please select delivery date and time")
      return
    }

    // For delivery, address is required (but coordinates can be used as fallback in backend)
    if (deliveryType === "delivery" && (!address || !address.trim())) {
      // Check if user has coordinates - if yes, we can proceed but still show warning
      const hasCoordinates = (checkoutLatitude && checkoutLongitude && 
                              checkoutLatitude !== "0" && checkoutLongitude !== "0") ||
                             (user && (user as any).latitude && (user as any).longitude && 
                              (user as any).latitude !== "0" && (user as any).longitude !== "0")
      
      if (!hasCoordinates) {
        setError("Delivery address is required. Please enter your delivery address or select location on map.")
        setIsEditingAddress(true) // Auto-open address editor if missing
        setShowMap(true)
        return
      } else {
        // User has coordinates but no address - use coordinates as address
        const lat = checkoutLatitude || (user as any).latitude
        const lng = checkoutLongitude || (user as any).longitude
        setAddress(`Location: ${lat}, ${lng}`)
      }
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
          item.selectedOptions.forEach((group: any) => {
            group.items.forEach((opt: any) => {
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
          item.selectedAddOns.forEach((addon: any) => {
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

      // Use description as order notes
      const fullDescription = description && description.trim() ? description.trim() : undefined

      // Validate required fields before sending
      if (!phoneNumber || phoneNumber.trim() === "") {
        setError("Phone number is required")
        setIsEditingPhone(true)
        setIsSubmitting(false)
        return
      }

      if (!areaCode || areaCode.trim() === "") {
        setError("Area code is required")
        setIsEditingAreaCode(true)
        setIsSubmitting(false)
        return
      }

      // For delivery, require address OR coordinates
      if (deliveryType === "delivery") {
        const hasAddress = address && address.trim()
        const hasCoordinates = (checkoutLatitude && checkoutLongitude && 
                                checkoutLatitude !== "0" && checkoutLongitude !== "0") ||
                               (user && (user as any).latitude && (user as any).longitude && 
                                (user as any).latitude !== "0" && (user as any).longitude !== "0")
        
        if (!hasAddress && !hasCoordinates) {
          setError("Delivery address is required. Please enter your delivery address or select location on map.")
          setIsEditingAddress(true)
          setShowMap(true)
          setIsSubmitting(false)
          return
        }
        // If we have coordinates but no address, use coordinates as address
        if (!hasAddress && hasCoordinates) {
          const lat = checkoutLatitude || (user as any).latitude
          const lng = checkoutLongitude || (user as any).longitude
          setAddress(`Location: ${lat}, ${lng}`)
        }
      }

      if (!selectedDate || !selectedTime) {
        setError("Please select delivery date and time")
        setIsSubmitting(false)
        return
      }

      const orderData: PlaceOrderData = {
        total_price: total,
        customer: user.id,
        description: fullDescription,
        phone_number: phoneNumber.trim(),
        payment_method: paymentMethod === "cash" ? "cash" : "online",
        area_code: areaCode.trim(),
        houseadress: deliveryType === "delivery" 
          ? (address && address.trim() 
              ? address.trim() 
              : (checkoutLatitude && checkoutLongitude && checkoutLatitude !== "0" && checkoutLongitude !== "0"
                  ? `Location: ${checkoutLatitude}, ${checkoutLongitude}` 
                  : ((user as any).latitude && (user as any).longitude 
                      ? `Location: ${(user as any).latitude}, ${(user as any).longitude}` 
                      : user.name || "")))
          : "",
        longitude: String(checkoutLongitude || (user as any).longitude || "0"),
        latitude: String(checkoutLatitude || (user as any).latitude || "0"),
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
          subtotal,
          deliveryFee,
          serviceFee,
          total,
        })
        
        if (sessionData.url) {
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
        router.push("/orders")
      } else {
        setError(response.message || response.error || "Failed to place order")
      }
    } catch (err: any) {
      // Handle session expiration
      if (err.message && (err.message.includes('Session expired') || err.message.includes('Authentication required') || err.message.includes('401'))) {
        setError("Your session has expired. Please login again.")
        setIsAccountModalOpen(true)
        setUser(null)
        // Clear auth data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          localStorage.removeItem('token_expiry')
        }
      } else {
        const errorMessage = err.message || err.error || "Failed to place order. Please try again."
        setError(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300 flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  // Require login - show message if not authenticated
  if (!user || !isAuthenticated()) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Header onMenuClick={() => setIsAccountModalOpen(true)} />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-6">
          <div className="bg-card rounded-xl p-6 sm:p-8 border border-border shadow-sm text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Login Required</h2>
            <p className="text-muted-foreground mb-6">Please login or create an account to proceed with checkout.</p>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="bg-orange-500 text-white font-semibold py-3 px-6 rounded-full hover:bg-orange-600 transition text-sm sm:text-base"
            >
              Login / Create Account
            </button>
          </div>
        </div>
        <MyAccountModal 
          isOpen={isAccountModalOpen} 
          onClose={() => {
            setIsAccountModalOpen(false)
            // Check auth again after modal closes
            const session = validateUserSession()
            if (session.valid && session.user) {
              setUser(session.user)
            } else {
              router.push('/')
            }
          }} 
        />
      </div>
    )
  }

  if (items.length === 0) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header onMenuClick={() => setIsAccountModalOpen(true)} />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-3 sm:mb-4 transition text-sm touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Two Column Layout */}
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left Column - Order Details */}
          <div className="flex-1 bg-card rounded-xl p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 md:space-y-5 border border-border shadow-sm">
            {/* Delivery/Collection Toggle */}
            <div className="mb-3 sm:mb-4">
              <div className="flex bg-muted/70 rounded-full p-0.5 border border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryType("delivery")
                    localStorage.setItem('deliveryType', 'delivery')
                    // If switching to delivery and no address, open address editor
                    if (!address || !address.trim()) {
                      setIsEditingAddress(true)
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 rounded-full text-xs sm:text-sm transition touch-manipulation ${
                    deliveryType === "delivery" ? "bg-accent text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Bike className={`w-4 h-4 sm:w-5 sm:h-5 ${deliveryType === "delivery" ? "text-orange-500" : ""}`} />
                  <span className="font-medium">Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryType("collection")
                    localStorage.setItem('deliveryType', 'collection')
                    // Close address editor and hide map when switching to collection
                    setIsEditingAddress(false)
                    setShowMap(false)
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 rounded-full text-xs sm:text-sm transition touch-manipulation ${
                    deliveryType === "collection" ? "bg-accent text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <ShoppingBag className={`w-4 h-4 sm:w-5 sm:h-5 ${deliveryType === "collection" ? "text-orange-500" : ""}`} />
                  <span className="font-medium">Collection</span>
                </button>
              </div>
            </div>

            {/* Order Details Section */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Order details</h3>
              
              {/* Customer Name */}
              {user ? (
                <div className="bg-muted/50 rounded-lg p-3 sm:p-3.5 mb-2 border border-border">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base break-words">{user.name}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-500/10 dark:bg-orange-500/20 rounded-lg p-3 sm:p-3.5 mb-2 border border-orange-500/30">
                  <div className="flex items-center gap-2 text-foreground flex-wrap">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base">Guest Checkout</span>
                    <button
                      type="button"
                      onClick={() => setIsAccountModalOpen(true)}
                      className="ml-auto text-xs sm:text-sm text-orange-500 hover:text-orange-600 underline touch-manipulation"
                    >
                      Login/Register
                    </button>
                  </div>
                </div>
              )}

              {/* Phone Number */}
              <div className="bg-muted/50 rounded-lg p-3 sm:p-3.5 mb-2 border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-foreground font-medium text-sm sm:text-base">Phone Number</span>
                    {!phoneNumber && (
                      <span className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded font-medium">Required</span>
                    )}
                  </div>
                  {!isEditingPhone ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(true)}
                      className="text-orange-500 hover:text-orange-400 touch-manipulation p-1 -mr-1"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSavePhone}
                      className="text-green-500 hover:text-green-400 text-xs sm:text-sm font-medium touch-manipulation px-2 py-1"
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
                    className="w-full mt-1.5 px-3 py-2.5 sm:py-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:border-orange-500 text-sm sm:text-base"
                    required
                  />
                ) : (
                  <p className="text-muted-foreground text-xs sm:text-sm break-words">{phoneNumber || "Not set"}</p>
                )}
              </div>

              {/* Area Code */}
              <div className="bg-muted/50 rounded-lg p-3 sm:p-3.5 mb-2 border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-foreground font-medium text-sm sm:text-base">Area Code</span>
                    {!areaCode && (
                      <span className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded font-medium">Required</span>
                    )}
                  </div>
                  {!isEditingAreaCode ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingAreaCode(true)}
                      className="text-orange-500 hover:text-orange-400 touch-manipulation p-1 -mr-1"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveAreaCode}
                      className="text-green-500 hover:text-green-400 text-xs sm:text-sm font-medium touch-manipulation px-2 py-1"
                    >
                      Save
                    </button>
                  )}
                </div>
                {isEditingAreaCode ? (
                  <input
                    type="text"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    placeholder="Enter area code"
                    maxLength={20}
                    required
                    className="w-full mt-1.5 px-3 py-2.5 sm:py-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:border-orange-500 text-sm sm:text-base"
                  />
                ) : (
                  <p className="text-muted-foreground text-xs sm:text-sm break-words">{areaCode || "Not set - Click to add"}</p>
                )}
              </div>

              {/* Address */}
              {deliveryType === "delivery" && (
                <div className="bg-muted/50 rounded-lg p-3 sm:p-3.5 mb-2 space-y-2 border border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                      <span className="text-foreground font-medium text-sm sm:text-base">Address</span>
                      {(() => {
                        const hasAddress = address && address.trim()
                        const hasCoordinates = checkoutLatitude && checkoutLongitude && 
                                              checkoutLatitude !== "0" && checkoutLongitude !== "0"
                        // Only show "Required" if no address AND no coordinates
                        if (!hasAddress && !hasCoordinates) {
                          return <span className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded font-medium">Required</span>
                        }
                        return null
                      })()}
                    </div>
                    {!isEditingAddress && (
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(true)}
                        className="text-orange-500 hover:text-orange-400 touch-manipulation p-1 -mr-1 flex-shrink-0"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Map Display */}
                  {showMap && deliveryType === "delivery" && (
                    <div className="mb-3">
                      <div className="h-[250px] sm:h-[300px] md:h-[350px]">
                        <LocationPicker
                          latitude={checkoutLatitude || (user as any)?.latitude || ""}
                          longitude={checkoutLongitude || (user as any)?.longitude || ""}
                          onLocationChange={handleLocationChange}
                        />
                      </div>
                      
                      {/* Buttons under the map */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setShowMap(false)}
                          className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition text-sm font-medium border border-border touch-manipulation"
                        >
                          Hide Map
                        </button>
                        {isEditingAddress && (
                          <button
                            type="button"
                            onClick={handleSaveAddress}
                            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium touch-manipulation"
                          >
                            Save Address
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Show Map button when map is hidden */}
                  {!showMap && (
                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className="w-full px-4 py-2.5 sm:py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm sm:text-base font-medium mb-2 dark:bg-orange-600 touch-manipulation"
                    >
                      Show Map to Select Location
                    </button>
                  )}
                  
                  {isEditingAddress ? (
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter delivery address (optional if you have location saved)"
                      rows={3}
                      className="w-full mt-1.5 px-3 py-2.5 sm:py-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:border-orange-500 resize-none text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-muted-foreground text-xs sm:text-sm break-words">
                      {address || (checkoutLatitude && checkoutLongitude && checkoutLatitude !== "0" && checkoutLongitude !== "0"
                        ? "Click to edit address (location saved)" 
                        : "Click to add address")}
                    </p>
                  )}
                  
                  {/* Save button for address textarea */}
                  {isEditingAddress && !showMap && (
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      className="w-full px-4 py-2.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm sm:text-base font-medium mt-2 touch-manipulation"
                    >
                      Save Address
                    </button>
                  )}
                </div>
              )}

              {/* Collection/Delivery Time */}
              <div className="bg-muted/50 rounded-lg p-3 sm:p-3.5 mb-2 border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-foreground font-medium text-sm sm:text-base">
                      {deliveryType === "delivery" ? "Delivery time" : "Collection time"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-orange-500 hover:text-orange-400 touch-manipulation p-1 -mr-1"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2.5 sm:py-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:border-orange-500 text-sm sm:text-base touch-manipulation"
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
                    className="px-3 py-2.5 sm:py-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:border-orange-500 text-sm sm:text-base touch-manipulation"
                    required
                  >
                    {generateTimeSlots().map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1.5">{formatDateTime()}</p>
              </div>

              {/* Order Notes */}
              <div className="bg-muted/50 rounded-lg p-3 sm:p-3.5 mb-2 border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-foreground font-medium text-sm sm:text-base">Add order notes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOrderNotes(!showOrderNotes)}
                    className="w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 touch-manipulation flex-shrink-0"
                  >
                    <span className="text-sm sm:text-xs">{showOrderNotes ? "-" : "+"}</span>
                  </button>
                </div>
                {showOrderNotes && (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add order notes..."
                    rows={3}
                    className="w-full mt-1.5 px-3 py-2.5 sm:py-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:border-orange-500 resize-none text-sm sm:text-base"
                  />
                )}
                {!showOrderNotes && description && (
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 break-words">{description}</p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 sm:p-3.5">
                <p className="text-red-400 text-xs sm:text-sm break-words">{error}</p>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="w-full lg:w-96 bg-card rounded-xl p-4 sm:p-5 flex flex-col h-fit lg:sticky lg:top-20 border border-border shadow-lg order-first lg:order-last">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Order summary</h3>
            
            {/* Restaurant Name */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-foreground font-medium text-sm sm:text-base">Oscar's Pizza & Kebab</span>
            </div>

            {/* Items */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowItems(!showItems)}
                className="text-orange-500 hover:text-orange-400 text-xs sm:text-sm font-medium mb-1.5 touch-manipulation"
              >
                {showItems ? "Hide" : "Show"} {items.length} {items.length === 1 ? "item" : "items"}
              </button>
              {showItems && (
                <div className="space-y-2 mt-1.5">
                  {items.map((item, index) => (
                    <div key={index} className="text-xs sm:text-sm">
                      <div className="text-foreground font-medium break-words">
                        {item.quantity}x {item.name}
                        {item.selectedSize && ` (${item.selectedSize.size || (item.selectedSize as any).name})`}
                      </div>
                      {/* Show toppings/options */}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="ml-3 mt-0.5 space-y-0.5">
                          {item.selectedOptions.map((group: any, groupIdx: number) => (
                            group.items.map((opt: any, optIdx: number) => (
                              <div key={`${groupIdx}-${optIdx}`} className="text-muted-foreground text-xs sm:text-sm break-words">
                                {opt.qty > 1 ? `${opt.qty}x ` : ''}{opt.name}
                              </div>
                            ))
                          ))}
                        </div>
                      )}
                      {/* Show add-ons/drinks */}
                      {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                        <div className="ml-3 mt-0.5 space-y-0.5">
                          {item.selectedAddOns.map((addon: any, addonIdx: number) => (
                            <div key={addonIdx} className="text-muted-foreground text-xs sm:text-sm break-words">
                              {addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-1.5 mb-3 pb-3 border-b border-border">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">€ {subtotal.toFixed(2)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Delivery fee <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </span>
                  <span className="text-foreground">€ {deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  Service fee <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </span>
                <span className="text-foreground">€ {serviceFee.toFixed(2)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between mb-4">
              <span className="text-foreground font-bold text-base sm:text-lg">Total</span>
              <span className="text-foreground font-bold text-base sm:text-lg">€ {total.toFixed(2)}</span>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                <span className="text-foreground font-medium text-sm sm:text-base">Payment method</span>
                {!paymentMethod && (
                  <span className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded font-medium">Required</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 rounded-full border-2 transition text-xs sm:text-sm touch-manipulation ${
                    paymentMethod === "cash"
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : "border-border bg-card text-muted-foreground hover:border-orange-500/50"
                  }`}
                >
                  <span className="text-base sm:text-lg font-semibold">€</span>
                  <span className="font-medium">Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 rounded-full border-2 transition text-xs sm:text-sm touch-manipulation ${
                    paymentMethod === "online"
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : "border-border bg-card text-muted-foreground hover:border-orange-500/50"
                  }`}
                >
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium">Online</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 text-white font-bold py-3.5 sm:py-3 rounded-full hover:bg-orange-600 transition text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed mb-3 dark:bg-orange-600 touch-manipulation"
            >
              {isSubmitting ? "Processing..." : "Order and pay"}
            </button>

            {/* Legal Disclaimer */}
            <p className="text-muted-foreground text-xs sm:text-sm text-center leading-relaxed">
              By selecting Order and pay you agree with the contents of your order, the data provided, our{" "}
              <a href="/privacy-statement" className="text-orange-500 hover:underline">privacy statement</a> and{" "}
              <a href="/terms-of-use" className="text-orange-500 hover:underline">terms of use</a>.
            </p>
          </div>
        </form>
      </div>

      {/* My Account Modal */}
      <MyAccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => {
          setIsAccountModalOpen(false)
          // Refresh user after modal closes
          const session = validateUserSession()
          if (session.valid && session.user) {
            setUser(session.user)
          }
        }} 
      />
    </div>
  )
}

