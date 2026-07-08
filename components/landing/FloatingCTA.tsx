import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowUp, Zap } from 'lucide-react';
import { Button } from '~/components/ui/button';

export function FloatingCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Floating CTA bar (bottom) */}
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border-t border-white/10 px-4 py-3">
              <div className="container mx-auto flex items-center justify-between gap-4">
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-100">
                    Siap menghemat waktu upload Anda?
                  </p>
                  <p className="text-xs text-gray-400">Mulai gratis — 20 kredit, tanpa kartu kredit</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/25 gap-2"
                  >
                    <Link href="/auth/signin">
                      <Zap className="w-4 h-4" aria-hidden="true" />
                      Mulai Gratis
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="hidden sm:inline-flex border border-white/10 text-gray-300 hover:bg-white/5 bg-transparent"
                  >
                    <a
                      href="#harga"
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById('harga');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Lihat Harga
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll-to-top button */}
      <AnimatePresence>
        {visible && (
          <motion.button
            onClick={scrollToTop}
            aria-label="Kembali ke atas"
            className="fixed bottom-20 right-6 z-50 w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-sm border border-white/10 text-gray-300 shadow-lg flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/30 hover:text-blue-400 transition-all duration-300"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
