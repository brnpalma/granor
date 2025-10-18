
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, remove } = useToast()

  return (
    <ToastProvider>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          toasts.length > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            duration={1500}
            onOpenChange={(open) => {
              if (!open) {
                remove(id);
              }
            }}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
