import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { Header } from "./components/Header";
import { Providers } from "./providers";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Remate — exit auctions",
  description: "Exit auctions for Hedera ATS bonds, settled in USDC on Arc.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} ${ibmPlexMono.variable} antialiased`}>
        <Providers>
          <div className="workspace-app">
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
