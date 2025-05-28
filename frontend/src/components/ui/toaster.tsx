'use client'

import { useToast } from '@/lib/hooks/use-toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={index}
          className={`p-4 rounded-md shadow-lg max-w-sm ${
            toast.variant === 'destructive'
              ? 'bg-red-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border'
          }`}
        >
          <div className="font-semibold">{toast.title}</div>
          {toast.description && (
            <div className="text-sm opacity-90 mt-1">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  )
}
