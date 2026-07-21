import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state${compact ? " empty-state-compact" : ""}`} role="status" aria-live="polite">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon size={compact ? 24 : 30} strokeWidth={1.8} />
      </div>
      <div className="empty-state-copy">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      {actionLabel && onAction ? (
        <button className="secondary-button empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
