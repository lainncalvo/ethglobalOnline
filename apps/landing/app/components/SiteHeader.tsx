import { BrandMark } from "./BrandMark";
import { LaunchLink } from "./LaunchLink";

interface SiteHeaderProps {
  dappUrl: string;
}

const navigation = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#infrastructure", label: "Infrastructure" },
];

export function SiteHeader({ dappUrl }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="page-shell flex h-[72px] items-center justify-between gap-6">
        <a className="text-[var(--ivory)] no-underline" href="#" aria-label="Remate home">
          <BrandMark />
        </a>

        <nav className="hidden items-center gap-8 text-sm text-[var(--muted)] md:flex" aria-label="Primary">
          {navigation.map((item) => (
            <a className="nav-link" href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="status-pill hidden sm:inline-flex">
            <span className="status-dot" />
            Testnet
          </span>
          <LaunchLink compact dappUrl={dappUrl} />
        </div>
      </div>
    </header>
  );
}
