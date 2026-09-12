"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { CurrentNetwork } from "./NetworkGuard";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/", label: "Market" },
  { href: "/sell", label: "Sell" },
  { href: "/operator", label: "Operator" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="workspace-header">
      <div className="workspace-header__inner">
        <Link href="/" aria-label="Remate market" className="no-underline">
          <BrandMark />
        </Link>
        <nav className="workspace-nav" aria-label="Exchange">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="workspace-nav__link"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="workspace-header__actions">
          <CurrentNetwork />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
