import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function NccPageHeader({
  icon: Icon, title, description, action,
}: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
