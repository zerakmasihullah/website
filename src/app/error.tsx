"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Page error:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">
          {error.message || "An unexpected error occurred"}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition"
          >
            Try again
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-card hover:bg-accent border border-border text-foreground rounded-lg transition"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  )
}

