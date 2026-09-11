import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import "./terminal.css";
import "./sections.css";
import "./responsive.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-display",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Remate — Liquidity for tokenized bonds",
  description:
    "Compliant exit auctions for Hedera ATS bonds, with USDC bids and settlement on Arc.",
  openGraph: {
    title: "Remate — Liquidity for tokenized bonds",
    description:
      "A compliant exit market for tokenized bonds. Built on Hedera ATS, Arc USDC and Chainlink CRE.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} ${ibmPlexMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
