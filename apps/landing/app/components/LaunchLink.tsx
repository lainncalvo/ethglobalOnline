import { ArrowIcon } from "./Icons";

interface LaunchLinkProps {
  dappUrl: string;
  compact?: boolean;
  label?: string;
}

export function LaunchLink({
  dappUrl,
  compact = false,
  label = "Launch App",
}: LaunchLinkProps) {
  return (
    <a
      className={`launch-link ${compact ? "launch-link-compact" : ""}`}
      href={dappUrl}
    >
      <span>{label}</span>
      <ArrowIcon className="h-4 w-4" />
    </a>
  );
}
