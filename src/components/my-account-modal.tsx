"use client"

import { useState, useEffect } from "react"
import { X, ShoppingBag, CreditCard } from "lucide-react"
import { login, register, getCurrentUser, logout, updateProfile, redirectToBillingPortal } from "@/lib/api"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import("@/components/location-picker"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] sm:h-[300px] bg-background rounded-xl border border-border flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Loading map...</div>
    </div>
  ),
})

interface MyAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MyAccountModal({ isOpen, onClose }: MyAccountModalProps) {
  const router = useRouter()
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  
  // Edit profile form states
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editAreaCode, setEditAreaCode] = useState("")
  const [editLatitude, setEditLatitude] = useState("")
  const [editLongitude, setEditLongitude] = useState("")
  
  // Login form states
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  
  // Register form states
  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("")
  const [registerPhone, setRegisterPhone] = useState("")
  const [registerAreaCode, setRegisterAreaCode] = useState("")
  const [registerLatitude, setRegisterLatitude] = useState("")
  const [registerLongitude, setRegisterLongitude] = useState("")

  useEffect(() => {
    if (isOpen) {
      const currentUser = getCurrentUser()
      setUser(currentUser)
      // Reset forms when modal opens
      setLoginEmail("")
      setLoginPassword("")
      setRegisterName("")
      setRegisterEmail("")
      setRegisterPassword("")
      setRegisterPasswordConfirm("")
      setRegisterPhone("")
      setRegisterAreaCode("")
      setRegisterLatitude("")
      setRegisterLongitude("")
      setIsEditMode(false)
      setError(null)
      setSuccess(null)
      setFieldErrors({})
    }
  }, [isOpen])

  useEffect(() => {
    // Load user data into edit form when entering edit mode
    if (isEditMode && user) {
      setEditName(user.name || "")
      setEditEmail(user.email || "")
      setEditPhone(user.phone_number || "")
      setEditAreaCode(user.area_code || "")
      setEditLatitude(user.latitude || "")
      setEditLongitude(user.longitude || "")
    }
  }, [isEditMode, user])


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await login(loginEmail, loginPassword)
      const currentUser = getCurrentUser()
      setUser(currentUser)
      setLoginEmail("")
      setLoginPassword("")
      
      // Dispatch auth event for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:login'))
      }
      
      // Close modal and navigate to home page
      onClose()
      router.push('/')
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    // Validate password confirmation
    if (registerPassword !== registerPasswordConfirm) {
      setError("Passwords do not match")
      setFieldErrors({ password: "Passwords do not match" })
      setLoading(false)
      return
    }

    // Validate required fields
    if (!registerName || !registerEmail || !registerPassword || !registerPhone || !registerAreaCode) {
      setError("Please fill in all required fields")
      setLoading(false)
      return
    }

    try {
      // Register the user
      await register({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        phone_number: registerPhone,
        area_code: registerAreaCode,
        latitude: registerLatitude || undefined,
        longitude: registerLongitude || undefined,
      })
      
      // Automatically log in the user after successful registration
      try {
        await login(registerEmail, registerPassword)
        const currentUser = getCurrentUser()
        setUser(currentUser)
        
        // Dispatch auth event for other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:login'))
        }
        
        // Clear form fields
        setRegisterName("")
        setRegisterEmail("")
        setRegisterPassword("")
        setRegisterPasswordConfirm("")
        setRegisterPhone("")
        setRegisterAreaCode("")
        setRegisterLatitude("")
        setRegisterLongitude("")
        setFieldErrors({})
        
        // Close modal and navigate to home page
        onClose()
        router.push('/')
      } catch (loginErr: any) {
        // If auto-login fails, switch to login mode
      setIsLoginMode(true)
        setLoginEmail(registerEmail)
      setRegisterName("")
      setRegisterEmail("")
      setRegisterPassword("")
      setRegisterPasswordConfirm("")
      setRegisterPhone("")
      setRegisterAreaCode("")
      setRegisterLatitude("")
      setRegisterLongitude("")
        setFieldErrors({})
        setSuccess("Registration successful! Please log in with your credentials.")
      }
    } catch (err: any) {
      // Parse validation errors from API response
      if (err.errors && typeof err.errors === 'object') {
        const errors: Record<string, string> = {}
        Object.keys(err.errors).forEach((key) => {
          const errorArray = err.errors[key]
          if (Array.isArray(errorArray) && errorArray.length > 0) {
            errors[key] = errorArray[0]
          }
        })
        setFieldErrors(errors)
        
        // Set general error message
        const generalError = err.message || "Validation failed. Please check the fields below."
        setError(generalError)
      } else {
      setError(err.message || "Registration failed. Please try again.")
        setFieldErrors({})
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setUser(null)
      setIsLoginMode(true)
      setIsEditMode(false)
      // Auth event is already dispatched by logout function
    } catch (err) {
      setUser(null)
      setIsLoginMode(true)
      setIsEditMode(false)
      // Dispatch logout event even if logout fails
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await updateProfile(user.id, {
        name: editName,
        email: editEmail,
        phone_number: editPhone || undefined,
        area_code: editAreaCode || undefined,
        latitude: editLatitude || undefined,
        longitude: editLongitude || undefined,
      })
      
      const updatedUser = getCurrentUser()
      setUser(updatedUser)
      setIsEditMode(false)
      setSuccess("Profile updated successfully!")
      
      // Dispatch auth event to refresh other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:login'))
      }
    } catch (err: any) {
      // Handle session expiration
      if (err.message && (err.message.includes('Session expired') || err.message.includes('Authentication required') || err.message.includes('401'))) {
        setError("Your session has expired. Please login again.")
        setUser(null)
        setIsLoginMode(true)
        setIsEditMode(false)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'))
        }
      } else {
        setError(err.message || "Failed to update profile. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrders = () => {
    onClose()
    router.push('/orders')
  }

  const handleBillingPortal = async () => {
    try {
      await redirectToBillingPortal()
    } catch (err: any) {
      setError(err.message || "Failed to open billing portal. Please try again.")
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-border transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 pb-3 sm:pb-5 border-b border-border bg-gradient-to-r from-card to-accent/50">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">My account</h2>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition p-1 hover:bg-accent rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 pb-8 sm:pb-10 overflow-y-auto flex-1 min-h-0">
          {!user ? (
            <>
              {/* Toggle between Login and Register */}
              <div className="flex gap-2 mb-4 sm:mb-6 bg-muted p-1 sm:p-1.5 rounded-xl">
                <button
                  onClick={() => {
                    setIsLoginMode(true)
                    setError(null)
                    setSuccess(null)
                  }}
                  className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-full font-medium text-sm sm:text-base transition-all ${
                    isLoginMode
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Log in
                </button>
                <button
                  onClick={() => {
                    setIsLoginMode(false)
                    setError(null)
                    setSuccess(null)
                  }}
                  className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-full font-medium text-sm sm:text-base transition-all ${
                    !isLoginMode
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Register
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 dark:bg-red-500/20 border border-red-500/50 rounded-lg text-red-600 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mb-4 p-3 bg-green-500/10 dark:bg-green-500/20 border border-green-500/50 rounded-lg text-green-600 dark:text-green-300 text-sm">
                  {success}
                </div>
              )}

              {/* Login Form */}
              {isLoginMode ? (
                <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-foreground text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition text-sm sm:text-base"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground text-sm font-medium mb-2">Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition text-sm sm:text-base"
                      placeholder="Enter your password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 sm:py-3.5 px-4 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {loading ? "Logging in..." : "Log in"}
                  </button>
                </form>
              ) : (
                /* Register Form */
                <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-foreground text-sm font-medium mb-2">Name *</label>
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => {
                        setRegisterName(e.target.value)
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' })
                      }}
                      required
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border transition text-sm sm:text-base ${
                        fieldErrors.name 
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                      }`}
                      placeholder="Enter your name"
                    />
                    {fieldErrors.name && (
                      <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-foreground text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => {
                        setRegisterEmail(e.target.value)
                        if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' })
                      }}
                      required
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border transition text-sm sm:text-base ${
                        fieldErrors.email 
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                      }`}
                      placeholder="Enter your email"
                    />
                    {fieldErrors.email && (
                      <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-foreground text-sm font-medium mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      value={registerPhone}
                      onChange={(e) => {
                        setRegisterPhone(e.target.value)
                        if (fieldErrors.phone_number) setFieldErrors({ ...fieldErrors, phone_number: '' })
                      }}
                      required
                      maxLength={15}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border transition text-sm sm:text-base ${
                        fieldErrors.phone_number 
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                      }`}
                      placeholder="Enter your phone number"
                    />
                    {fieldErrors.phone_number && (
                      <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.phone_number}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-foreground text-sm font-medium mb-2">Area Code *</label>
                    <input
                      type="text"
                      value={registerAreaCode}
                      onChange={(e) => {
                        setRegisterAreaCode(e.target.value)
                        if (fieldErrors.area_code) setFieldErrors({ ...fieldErrors, area_code: '' })
                      }}
                      required
                      maxLength={10}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border transition text-sm sm:text-base ${
                        fieldErrors.area_code 
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                      }`}
                      placeholder="Enter your area code"
                    />
                    {fieldErrors.area_code && (
                      <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.area_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-foreground text-sm font-medium mb-2">Password *</label>
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value)
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' })
                      }}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border transition text-sm sm:text-base ${
                        fieldErrors.password 
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                      }`}
                      placeholder="Enter your password (min. 6 characters)"
                    />
                    {fieldErrors.password && (
                      <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-foreground text-sm font-medium mb-2">Confirm Password *</label>
                    <input
                      type="password"
                      value={registerPasswordConfirm}
                      onChange={(e) => {
                        setRegisterPasswordConfirm(e.target.value)
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' })
                      }}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border transition text-sm sm:text-base ${
                        fieldErrors.password 
                          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                      }`}
                      placeholder="Confirm your password"
                    />
                    {fieldErrors.password && (
                      <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                    )}
                  </div>
                  
                  {/* Location Section - Fixed small size */}
                  <div className="mb-4">
                    <label className="block text-foreground text-sm font-medium mb-2">Location (Optional)</label>
                    <LocationPicker
                      latitude={registerLatitude}
                      longitude={registerLongitude}
                      onLocationChange={(lat, lng) => {
                        setRegisterLatitude(lat)
                        setRegisterLongitude(lng)
                      }}
                      height="120px"
                    />
                  </div>
                  
                  {/* Register Button - At the end with spacing */}
                  <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 sm:py-3.5 px-4 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {loading ? "Creating account..." : "Create account"}
                  </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* User Logged In */
            <div className="space-y-3 sm:space-y-4">
              {!isEditMode ? (
                <>
                  {/* User Info */}
                  <div className="bg-gradient-to-br from-card to-accent/50 rounded-xl p-4 sm:p-5 border border-border">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center ring-2 ring-orange-500/30 flex-shrink-0">
                        <span className="text-white font-bold text-lg sm:text-xl">{user.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-foreground font-semibold text-base sm:text-lg truncate">{user.name}</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm truncate">{user.email}</p>
                        {user.phone_number && (
                          <p className="text-muted-foreground/70 text-xs mt-1 truncate">{user.phone_number}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="flex-1 bg-orange-500/10 text-orange-400 font-medium py-2 sm:py-2.5 px-3 sm:px-4 rounded-full hover:bg-orange-500/20 transition border border-orange-500/30 text-sm sm:text-base"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex-1 bg-muted text-foreground font-medium py-2 sm:py-2.5 px-3 sm:px-4 rounded-full hover:bg-accent transition border border-border text-sm sm:text-base"
                      >
                        Log out
                      </button>
                    </div>
                  </div>

                  {/* My Orders */}
                  <button 
                    onClick={handleViewOrders}
                    className="w-full flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-card to-accent/50 text-foreground hover:from-accent/50 hover:to-accent rounded-xl transition border border-border hover:border-orange-500/50 group"
                  >
                    <div className="p-1.5 sm:p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition flex-shrink-0">
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    </div>
                    <span className="flex-1 text-left font-medium text-sm sm:text-base">My orders</span>
                    <span className="text-muted-foreground group-hover:text-orange-500 transition text-lg sm:text-xl">→</span>
                  </button>

                  {/* Billing Portal */}
                  <button 
                    onClick={handleBillingPortal}
                    className="w-full flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-card to-accent/50 text-foreground hover:from-accent/50 hover:to-accent rounded-xl transition border border-border hover:border-orange-500/50 group"
                  >
                    <div className="p-1.5 sm:p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition flex-shrink-0">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    </div>
                    <span className="flex-1 text-left font-medium text-sm sm:text-base">Payment Methods</span>
                    <span className="text-muted-foreground group-hover:text-orange-500 transition text-lg sm:text-xl">→</span>
                  </button>
                </>
              ) : (
                /* Edit Profile Form */
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">Edit Profile</h3>
                    <button
                      onClick={() => {
                        setIsEditMode(false)
                        setError(null)
                        setSuccess(null)
                      }}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 dark:bg-red-500/20 border border-red-500/50 rounded-lg text-red-600 dark:text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-500/10 dark:bg-green-500/20 border border-green-500/50 rounded-lg text-green-600 dark:text-green-300 text-sm">
                      {success}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-foreground text-sm font-medium mb-2">Name *</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition text-sm sm:text-base"
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <label className="block text-foreground text-sm font-medium mb-2">Email *</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition text-sm sm:text-base"
                        placeholder="Enter your email"
                      />
                    </div>
                    <div>
                      <label className="block text-foreground text-sm font-medium mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        maxLength={15}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition text-sm sm:text-base"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-foreground text-sm font-medium mb-2">Area Code</label>
                      <input
                        type="text"
                        value={editAreaCode}
                        onChange={(e) => setEditAreaCode(e.target.value)}
                        maxLength={20}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition text-sm sm:text-base"
                        placeholder="Enter your area code"
                      />
                    </div>

                    {/* Location Section */}
                    <div>
                      <LocationPicker
                        latitude={editLatitude}
                        longitude={editLongitude}
                        onLocationChange={(lat, lng) => {
                          setEditLatitude(lat)
                          setEditLongitude(lng)
                        }}
                        height="200px"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false)
                          setError(null)
                          setSuccess(null)
                        }}
                        className="flex-1 bg-muted text-foreground font-medium py-2.5 sm:py-3 px-3 sm:px-4 rounded-full hover:bg-accent transition border border-border text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      >
                        {loading ? "Updating..." : "Update Profile"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
