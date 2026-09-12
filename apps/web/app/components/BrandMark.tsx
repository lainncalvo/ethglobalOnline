export function BrandMark() {
  return (
    <span className="brand-mark">
      <svg
        aria-hidden="true"
        className="brand-mark__glyph"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M4 4h10v10H4z" stroke="currentColor" strokeWidth="1.5" />
        <path d="m10 10 10 10M14 4v10H4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="18.5" cy="5.5" r="1.5" fill="currentColor" />
      </svg>
      <span className="brand-mark__word">Remate</span>
    </span>
  );
}
