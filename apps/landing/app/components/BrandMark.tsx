export function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Remate">
      <svg className="h-6 w-6 text-[var(--ivory)]" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 4h12.5L20 7.5 16.5 11H9v4h5.5L18 18.5 16.5 20H4V4Zm5 3v1h6.25l1-1H9Zm0 11h6.25l-1-1H9v1Z"
          fill="currentColor"
        />
      </svg>
      <span className="text-[1.12rem] font-semibold tracking-[-0.035em]">Remate</span>
    </span>
  );
}
