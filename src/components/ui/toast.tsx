"use client";

import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";

export function Toaster({ closeLabel }: { closeLabel: string }) {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed end-4 top-20 z-50 flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-2 outline-none">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className={`rounded-xl border bg-surface p-4 text-foreground shadow-xl outline-none ${
              toast.type === "error"
                ? "border-danger"
                : "border-border-strong"
            }`}
          >
            <Toast.Content className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <Toast.Title className="text-sm font-semibold leading-6">
                    {toast.title}
                  </Toast.Title>
                  {toast.description ? (
                    <Toast.Description className="text-sm leading-6 text-muted">
                      {toast.description}
                    </Toast.Description>
                  ) : null}
                </div>
                <Toast.Close
                  aria-label={closeLabel}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X className="size-4" aria-hidden="true" />
                </Toast.Close>
              </div>
              {toast.actionProps ? (
                <Toast.Action
                  {...toast.actionProps}
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-danger bg-danger-bg px-3 text-sm font-medium text-danger hover:bg-danger-bg/80 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                />
              ) : null}
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
