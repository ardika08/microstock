import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Zap, Menu, X } from 'lucide-react';

function scrollToSection(id: string, onDone?: () => void) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    onDone?.();
  }
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      // Tutup mobile menu saat scroll
      if (mobileOpen) setMobileOpen(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileOpen]);

  // Tutup menu saat resize ke desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Scroll progress indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400 z-[60] origin-left"
        style={{ scaleX }}
      />

      <nav
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
          scrolled
            ? 'bg-slate-900/95 backdrop-blur-xl border-white/10'
            : 'bg-slate-900/80 backdrop-blur-xl border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
                <Zap className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Autofillstock
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-white/5"
                onClick={() => scrollToSection('fitur')}
              >
                Fitur
              </Button>
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-white/5"
                onClick={() => scrollToSection('harga')}
              >
                Harga
              </Button>
              <Button asChild className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0">
                <Link href="/auth/login">Login</Link>
              </Button>
            </div>

            {/* Mobile: Login + Hamburger */}
            <div className="flex sm:hidden items-center gap-2">
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0 text-xs px-3"
              >
                <Link href="/auth/login">Login</Link>
              </Button>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu navigasi'}
                aria-expanded={mobileOpen}
                className="flex items-center justify-center w-9 h-9 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                {mobileOpen
                  ? <X className="w-5 h-5" aria-hidden="true" />
                  : <Menu className="w-5 h-5" aria-hidden="true" />
                }
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="sm:hidden overflow-hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-xl"
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                <button
                  className="w-full text-left px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                  onClick={() => scrollToSection('fitur', () => setMobileOpen(false))}
                >
                  Fitur
                </button>
                <button
                  className="w-full text-left px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                  onClick={() => scrollToSection('harga', () => setMobileOpen(false))}
                >
                  Harga
                </button>
                <div className="pt-2 pb-1">
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0"
                  >
                    <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                      Login / Daftar
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
