"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { browserClient } from "@/lib/supabase-browser";

export function DashboardNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => pathname.startsWith(path);

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
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition ${
                isActive("/dashboard") && !isActive("/dashboard/meals")
                  ? "text-orange-600"
                  : "text-gray-700 dark:text-gray-300 hover:text-orange-600"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/meals"
              className={`text-sm font-medium transition ${
                isActive("/dashboard/meals")
                  ? "text-orange-600"
                  : "text-gray-700 dark:text-gray-300 hover:text-orange-600"
              }`}
            >
              🍛 Meals (130+)
            </Link>
            <Link
              href="/dashboard/profile"
              className={`text-sm font-medium transition ${
                isActive("/dashboard/profile")
                  ? "text-orange-600"
                  : "text-gray-700 dark:text-gray-300 hover:text-orange-600"
              }`}
            >
              Profile
            </Link>
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
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/meals"
              className="block px-4 py-2 text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
              onClick={() => setIsOpen(false)}
            >
              🍛 Meals (130+)
            </Link>
            <Link
              href="/dashboard/profile"
              className="block px-4 py-2 text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
              onClick={() => setIsOpen(false)}
            >
              Profile
            </Link>
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
