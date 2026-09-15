import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import "./terminal.css";
import "./sections.css";
import "./motion.css";
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
  title: "Remate — Secondary markets for tokenized bonds and its KYC'd users",
  description:
    "Secondary markets for tokenized bonds and its KYC'd users. Bid and win. Only wallets already KYC'd for that bond can bid and buy.",
  openGraph: {
    title: "Remate — Bid and win",
    description:
      "Secondary markets for tokenized bonds and its KYC'd users. Bid and win.",
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
