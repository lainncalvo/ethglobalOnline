type IconProps = {
  className?: string;
};

export function DisconnectIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M6.25 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.75M10.5 5l3 3-3 3M13.25 8H6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}
