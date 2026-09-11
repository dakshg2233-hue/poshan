"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { browserClient } from "@/lib/supabase-browser";

/**
 * The signed-in navigation.
 *
 * Single source of links, rendered twice (desktop row, mobile sheet).
 * It used to be two hand-maintained copies of the same list, which is how
 * /today, /timeline and /privacy-centre ended up shipping with no way to
 * reach them: adding a route meant remembering to edit two places, and the
 * cost of forgetting was a page that existed and was invisible. One array
 * makes that failure mode structurally impossible.
 */
const LINKS: { href: string; label: string; exact?: boolean }[] = [
  /* Today first: it is the screen a phone should open to, and the one
     answering the question people actually have when they open Poshan. */
  { href: "/today", label: "Today" },
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/meals", label: "🍛 Meals" },
  { href: "/timeline", label: "Timeline" },
  { href: "/privacy-centre", label: "Privacy" },
  { href: "/profile", label: "Profile" },
];

export function DashboardNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  /* `exact` exists for /dashboard, which is a prefix of /dashboard/meals —
     without it both light up at once and the highlight stops meaning
     "where you are". */
  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname.startsWith(path);

  async function handleLogout() {
    const supabase = browserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur dark:bg-slate-900/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
              🥘
            </div>
            <span className="text-xl">Poshan</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition ${
                  isActive(link.href, link.exact)
                    ? "text-orange-600"
                    : "text-gray-700 dark:text-gray-300 hover:text-orange-600"
                }`}
                aria-current={isActive(link.href, link.exact) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Logout Button */}
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-orange-600 border border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
          >
            <LogOut size={16} />
            Logout
          </button>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-2 text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded ${
                  isActive(link.href, link.exact) ? "text-orange-600" : ""
                }`}
                aria-current={isActive(link.href, link.exact) ? "page" : undefined}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                handleLogout();
                setIsOpen(false);
              }}
              className="block w-full px-4 py-2 text-sm font-medium text-left text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
