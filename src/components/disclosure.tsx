"use client";

import { useState, type ReactNode } from "react";

export function Disclosure({
  title,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
        {title}
      </summary>
      {children}
    </details>
  );
}
