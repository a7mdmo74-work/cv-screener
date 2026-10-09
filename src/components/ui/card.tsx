import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: CardProps) {
  return <div className={`space-y-1.5 p-5 sm:p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: CardProps) {
  return (
    <h2 className={`text-base font-semibold leading-none tracking-tight ${className}`} {...props} />
  );
}

export function CardDescription({ className = "", ...props }: CardProps) {
  return (
    <p
      className={`text-sm leading-6 text-muted  ${className}`}
      {...props}
    />
  );
}

export function CardContent({ className = "", ...props }: CardProps) {
  return <div className={`p-5 pt-0 sm:p-6 ${className}`} {...props} />;
}
