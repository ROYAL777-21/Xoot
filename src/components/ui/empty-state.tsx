import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      "permission-primer slide-up-soft flex flex-col items-center justify-center rounded-lg px-6 py-10 text-center",
      className,
    )}
  >
    {icon ? (
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
    ) : null}
    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
