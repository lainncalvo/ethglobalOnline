import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function ArrowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function CheckShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 2.5 20 6v5.7c0 5-3.4 8.2-8 9.8-4.6-1.6-8-4.8-8-9.8V6l8-3.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m8.6 12 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function HoldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="4" y="8" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 8V6.5a3.5 3.5 0 0 1 7 0V8" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function NetworkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <circle cx="4" cy="10" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="16" cy="5" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="16" cy="15" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="m6 9 8-3M6 11l8 3" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function ReserveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <ellipse cx="10" cy="5" rx="6" ry="2.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 5v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5M4 10v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
