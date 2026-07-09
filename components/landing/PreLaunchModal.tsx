import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { X, Zap, Gift, Clock } from 'lucide-react';

const STORAGE_KEY = 'autofillstock_prelaunch_seen';

export function PreLaunchModal() {
  const [visible, setVisible] = useState(false);
  const { status } = useSession();

  useEffect(() => {
    // Jangan tampilkan jika user sudah login
    if (status === 'authenticated') return;
    if (status === 'loading') return;

    // Gunakan sessionStorage — muncul tiap session baru, bukan sekali selamanya
    try {
      const seen = sessionStorage.getItem(STORAGE_KEY);
      if (!seen) {
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // sessionStorage tidak tersedia (SSR) — tidak tampilkan
    }
  }, [status]);

  const handleClose = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prelaunch-title"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-md pointer-events-auto">
              {/* Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-cyan-400/30 to-purple-500/30 rounded-2xl blur-xl" />

              <div className="relative bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Header gradient bar */}
                <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500" />

                {/* Close button */}
                <button
                  onClick={handleClose}
                  aria-label="Tutup"
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>

                <div className="p-8">
                  {/* Badge */}
                  <div className="flex items-center justify-center mb-6">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300">
                      <Clock className="w-4 h-4" aria-hidden="true" />
                      Pre-Launch Special 🎉
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    id="prelaunch-title"
                    className="text-2xl font-bold text-center text-gray-100 mb-2"
                  >
                    Bonus Kredit Pre-Launch!
                  </h2>
                  <p className="text-center text-gray-400 text-sm mb-8">
                    Daftar sekarang dan dapatkan kredit <span className="text-white font-semibold">lebih banyak</span> dari harga normal.
                  </p>

                  {/* Bonus items */}
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-blue-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-100">Free Trial</p>
                        <p className="text-xs text-gray-400">Gratis, tanpa kartu kredit</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500 line-through">20 kredit</p>
                        <p className="text-sm font-bold text-emerald-400">50 kredit 🎁</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Gift className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-100">Top Up Kredit</p>
                        <p className="text-xs text-gray-400">Rp50.000 · tidak expire</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500 line-through">500 kredit</p>
                        <p className="text-sm font-bold text-emerald-400">750 kredit 🎁</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-100">Starter</p>
                        <p className="text-xs text-gray-400">Rp99.000/bulan · unlimited</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-cyan-400">+1 bulan gratis 🎁</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    href="/auth/login"
                    onClick={handleClose}
                    className="block w-full text-center py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 mb-3"
                  >
                    Klaim Bonus Sekarang ✨
                  </Link>
                  <button
                    onClick={handleClose}
                    className="block w-full text-center py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Nanti saja
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
