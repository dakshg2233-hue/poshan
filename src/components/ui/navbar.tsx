"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur dark:bg-slate-900/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
              🍽️
            </div>
            <span className="text-xl">Poshan</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#check" className="text-sm font-medium hover:text-orange-600 transition">
              Check BMI
            </Link>
            <Link href="/#plate" className="text-sm font-medium hover:text-orange-600 transition">
              Meal Plans
            </Link>
            <Link href="/#bios" className="text-sm font-medium hover:text-orange-600 transition">
              Biomarkers
            </Link>
            <Link href="/#premium" className="text-sm font-medium hover:text-orange-600 transition">
              Premium
            </Link>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/login" 
              className="px-4 py-2 rounded-lg text-sm font-medium border border-orange-600 text-orange-600 hover:bg-orange-50 transition"
            >
              Sign In
            </Link>
            <Link 
              href="/#premium" 
              className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition"
            >
              Get Premium
            </Link>
          </div>

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
              href="/#check" 
              className="block px-4 py-2 text-sm font-medium hover:bg-orange-50 rounded"
              onClick={() => setIsOpen(false)}
            >
              Check BMI
            </Link>
            <Link 
              href="/#plate" 
              className="block px-4 py-2 text-sm font-medium hover:bg-orange-50 rounded"
              onClick={() => setIsOpen(false)}
            >
              Meal Plans
            </Link>
            <Link 
              href="/#bios" 
              className="block px-4 py-2 text-sm font-medium hover:bg-orange-50 rounded"
              onClick={() => setIsOpen(false)}
            >
              Biomarkers
            </Link>
            <Link 
              href="/#premium" 
              className="block px-4 py-2 text-sm font-medium hover:bg-orange-50 rounded"
              onClick={() => setIsOpen(false)}
            >
              Premium
            </Link>
            <div className="pt-4 space-y-2">
              <Link 
                href="/login" 
                className="block w-full px-4 py-2 rounded-lg text-sm font-medium border border-orange-600 text-orange-600 hover:bg-orange-50 text-center transition"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link 
                href="/#premium" 
                className="block w-full px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 text-center transition"
                onClick={() => setIsOpen(false)}
              >
                Get Premium
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
