"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Heart, Menu, X } from "lucide-react";
import { useStyle } from "@/hooks/useStyle";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/onboarding", label: "Style me" },
  { href: "/recommendations", label: "My outfits" },
  { href: "/build-around", label: "My clothes" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { saved } = useStyle();

  return (
    <header className="sticky top-0 z-40 border-b border-beige-deep/60 bg-ivory/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="fitsy home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={cn("rounded-full px-4 py-2 text-sm transition hover:bg-beige", pathname === l.href ? "bg-beige font-medium" : "text-taupe-dark")}>
              {l.label}
            </Link>
          ))}
          <Link href="/profile#saved" className="ml-2 flex items-center gap-1.5 rounded-full border border-beige-deep px-3 py-2 text-sm hover:bg-beige" aria-label={`Saved outfits: ${saved.length}`}>
            <Heart size={14} /> {saved.length}
          </Link>
        </nav>
        <button className="rounded-full p-2 hover:bg-beige md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-beige-deep/60 bg-ivory px-4 pb-4 md:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={cn("block rounded-xl px-3 py-3 text-sm", pathname === l.href ? "bg-beige font-medium" : "text-taupe-dark")}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
