"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ShoppingBag, Clock, MapPin, Phone, Package } from "lucide-react"
import { getCurrentUser, getCustomerOrders, logout } from "@/lib/api"
import Header from "@/components/header"
import MyAccountModal from "@/components/my-account-modal"

export default function OrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push('/')
      return
    }
    setUser(currentUser)
    fetchOrders(currentUser.id)
  }, [router])

  useEffect(() => {
    // Refresh user and orders when modal closes
    if (!isAccountModalOpen) {
      const currentUser = getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        fetchOrders(currentUser.id)
      } else {
        router.push('/')
      }
    }
  }, [isAccountModalOpen, router])

  const fetchOrders = async (customerId: number) => {
    try {
      setLoading(true)
      const ordersData = await getCustomerOrders(customerId)
      // Sort orders by created_at descending (newest first)
      const sortedOrders = ordersData.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA
      })
      setOrders(sortedOrders)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: number) => {
    const statusMap: { [key: number]: { label: string; bgColor: string; textColor: string } } = {
      1: { label: "Pending", bgColor: "bg-yellow-500/10", textColor: "text-yellow-500" },
      2: { label: "Accepted", bgColor: "bg-green-500/10", textColor: "text-green-500" },
      3: { label: "Rejected", bgColor: "bg-red-500/10", textColor: "text-red-500" },
    }
    const statusInfo = statusMap[status] || { label: "Unknown", bgColor: "bg-gray-500/10", textColor: "text-gray-500" }
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusInfo.bgColor} ${statusInfo.textColor}`}>
        {statusInfo.label}
      </span>
    )
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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="sticky top-0 z-50">
        <Header onMenuClick={() => setIsAccountModalOpen(true)} />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push('/')}
              className="text-muted-foreground hover:text-orange-500 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <h1 className="text-2xl font-medium text-foreground">Orders</h1>
            </div>
          </div>
          {orders.length > 0 && (
            <p className="text-muted-foreground text-sm ml-8">{orders.length} {orders.length === 1 ? 'order' : 'orders'}</p>
          )}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-4 h-4 border-2 border-border border-t-orange-500 rounded-full animate-spin"></div>
              Loading...
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-1">No orders</h2>
            <p className="text-muted-foreground text-sm mb-6">You haven't placed any orders yet.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-orange-500 text-white text-sm font-medium py-2.5 px-6 rounded-lg hover:bg-orange-600 transition dark:bg-orange-600"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div
                key={order.id}
                className="bg-card rounded-lg border border-border p-5 hover:border-orange-500/50 transition-colors shadow-sm"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-border">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-foreground">Order #{order.id}</h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatDate(order.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-foreground">
                      {formatPrice(order.total_price)}
                    </div>
                    {order.discount && parseFloat(order.discount) > 0 && (
                      <div className="text-xs text-green-500 mt-1">
                        Saved {formatPrice(order.discount)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-border">
                    {order.items.map((item: any, itemIdx: number) => (
                      <div key={itemIdx} className="text-sm mb-2.5 last:mb-0">
                        <span className="text-orange-500 font-medium">{item.quantity}x</span>{' '}
                        <span className="text-foreground">{item.name}</span>
                        {item.size && <span className="text-muted-foreground"> ({item.size.name})</span>}
                        {item.attachments && item.attachments.length > 0 && (
                          <div className="ml-5 mt-1.5 space-y-1">
                            {item.attachments.map((attachment: any, attIdx: number) => (
                              <div key={attIdx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
                                {attachment.quantity > 1 && <span className="text-muted-foreground/70">{attachment.quantity}x</span>}
                                {attachment.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery Info */}
                {(order.address || order.area_code || order.phone_number) && (
                  <div className="mb-4 pb-4 border-b border-border space-y-2 text-sm">
                    {order.address && (
                      <div className="flex items-start gap-2 text-foreground">
                        <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span>{order.address}</span>
                      </div>
                    )}
                    {order.area_code && (
                      <div className="text-muted-foreground ml-6">
                        Area Code: <span className="text-foreground">{order.area_code}</span>
                      </div>
                    )}
                    {order.phone_number && (
                      <div className="flex items-center gap-2 text-foreground ml-6">
                        <Phone className="w-4 h-4 text-orange-500" />
                        {order.phone_number}
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Method */}
                {order.payment_method && (
                  <div className="text-sm text-muted-foreground">
                    Payment: <span className="text-foreground capitalize font-medium">{order.payment_method}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Account Modal */}
      <MyAccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
      />
    </div>
  )
}

