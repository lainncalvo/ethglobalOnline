"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <header className="border-b border-[var(--line)] bg-white">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[22px] font-semibold text-[var(--ink)] no-underline">
            Remate
          </Link>
          <nav className="flex items-center gap-4 text-[16px]">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? "font-semibold text-[var(--ink)] no-underline" : "text-[var(--muted)]"}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <CurrentNetwork />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
