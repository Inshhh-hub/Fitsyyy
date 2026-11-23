import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/navigation/Navbar";
import { ToastProvider } from "@/components/ui/Toast";
import { StyleProvider } from "@/hooks/useStyle";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "fitsy — Your Style. Your Identity. Perfectly Matched.",
  description: "An AI personal fashion stylist for India: outfits matched to your proportions, colouring, occasion and budget.",
};

export const viewport: Viewport = { themeColor: "#FAF6EE", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body>
        <ToastProvider>
          <StyleProvider>
            <Navbar />
            <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-10 sm:px-6">{children}</main>
            <footer className="border-t border-beige-deep/60 py-8 text-center text-xs text-taupe">
              © {new Date().getFullYear()} fitsy · Styling suggestions, not guarantees. Some links are affiliate links, so we may earn a commission at no extra cost to you. Prices and availability come from the product source shown on each item and can change.
            </footer>
          </StyleProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
