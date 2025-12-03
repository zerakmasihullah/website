"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, ShoppingBag, Clock, MapPin, Phone, Package, ArrowLeft, Loader2 } from "lucide-react"
import { getCurrentUser, getOrderBySession } from "@/lib/api"
import Header from "@/components/header"

export default function OrderSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState("")
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found")
      setLoading(false)
      return
    }

    // Fetch order details using session ID
    fetchOrderDetails()
  }, [sessionId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const orderData = await getOrderBySession(sessionId!)
      setOrder(orderData)
      // Clear basket after successful order
      if (typeof window !== 'undefined') {
        localStorage.removeItem('basketItems')
        window.dispatchEvent(new Event('basketCleared'))
      }
    } catch (err: any) {
      setError(err.message || "Failed to load order details. Please check your orders page.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return `€ ${numPrice.toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <Header onMenuClick={() => {}} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <div className="text-gray-400">Loading order details...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <Header onMenuClick={() => {}} />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
            <div className="text-red-400 mb-4">{error}</div>
            <button
              onClick={() => router.push('/orders')}
              className="bg-orange-500 text-white font-medium py-2.5 px-6 rounded-full hover:bg-orange-600 transition"
            >
              View My Orders
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header onMenuClick={() => {}} />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-400">Thank you for your order. We've received your payment.</p>
        </div>

        {/* Order Card */}
        <div className="bg-[#2a2a2a] rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Order Info */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-white">Order #{order.id}</h2>
                  <span className="px-3 py-1 rounded-full text-xs font-medium border bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                    Pending
                  </span>
                </div>
                <p className="text-gray-400 text-sm flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(order.created_at)}
                </p>
              </div>

              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-white mb-2">Items:</h3>
                  {order.items.map((item: any, itemIdx: number) => (
                    <div key={itemIdx} className="text-sm">
                      <div className="text-gray-300">
                        {item.quantity}x {item.name}
                        {item.size && ` (${item.size.name})`}
                      </div>
                      {/* Show attachments (toppings, drinks, etc.) */}
                      {item.attachments && item.attachments.length > 0 && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.attachments.map((attachment: any, attIdx: number) => (
                            <div key={attIdx} className="text-gray-400 text-xs">
                              {attachment.quantity > 1 ? `${attachment.quantity}x ` : ''}{attachment.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Delivery Info */}
              {(order.address || order.area_code) && (
                <div className="space-y-2 pt-4 border-t border-gray-700">
                  {order.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{order.address}</span>
                    </div>
                  )}
                  {order.area_code && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Area Code:</span>
                      <span className="text-gray-300">{order.area_code}</span>
                    </div>
                  )}
                  {order.phone_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-orange-500" />
                      <span className="text-gray-300">{order.phone_number}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method */}
              {order.payment_method && (
                <div className="text-sm pt-4 border-t border-gray-700">
                  <span className="text-gray-400">Payment Method: </span>
                  <span className="text-gray-300 capitalize">{order.payment_method}</span>
                  <span className="text-green-400 ml-2">✓ Paid</span>
                </div>
              )}
            </div>

            {/* Order Total */}
            <div className="md:text-right">
              <div className="text-3xl font-bold text-white mb-1">
                {formatPrice(order.total_price)}
              </div>
              {order.discount && parseFloat(order.discount) > 0 && (
                <div className="text-sm text-green-400">
                  Discount: {formatPrice(order.discount)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/orders')}
            className="flex-1 bg-orange-500 text-white font-medium py-3 px-6 rounded-full hover:bg-orange-600 transition flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            View All Orders
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-[#2a2a2a] text-white font-medium py-3 px-6 rounded-full hover:bg-[#333] transition border border-gray-700 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/50 rounded-xl p-4">
          <p className="text-blue-400 text-sm">
            <strong>What's next?</strong> We'll send you an email confirmation shortly. Your order is being prepared and you'll receive updates on its status.
          </p>
        </div>
      </div>
    </div>
  )
}

