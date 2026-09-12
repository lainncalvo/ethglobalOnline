type StatusIndicatorProps = {
  label: string;
  compactLabel?: string;
  tone?: "neutral" | "positive";
};

export function StatusIndicator({
  label,
  compactLabel = label,
  tone = "neutral",
}: StatusIndicatorProps) {
  return (
    <span
      className={`status-indicator status-indicator--${tone}`}
      role="status"
      aria-label={label}
      title={label}
    >
      <span className="status-indicator__dot" aria-hidden="true" />
      <span className="status-indicator__label" aria-hidden="true">
        {label}
      </span>
      <span className="status-indicator__label--compact" aria-hidden="true">
        {compactLabel}
      </span>
    </span>
  );
}
