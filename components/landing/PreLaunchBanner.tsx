import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X } from 'lucide-react';

// Pre-launch end date: 16 Juli 2026 23:59:59 WIB (UTC+7)
const PRELAUNCH_END = new Date('2026-07-16T23:59:59+07:00').getTime();
const BANNER_DISMISSED_KEY = 'autofillstock_banner_dismissed';

function getTimeLeft() {
  const now = Date.now();
  const diff = PRELAUNCH_END - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 rounded-lg px-2.5 py-1.5 min-w-[2.5rem] text-center">
        <span className="text-lg font-bold text-white tabular-nums leading-none">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-white/60 mt-1 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export function PreLaunchBanner() {
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft>>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Cek apakah sudah di-dismiss atau pre-launch sudah berakhir
    try {
      if (localStorage.getItem(BANNER_DISMISSED_KEY)) {
        setDismissed(true);
        return;
      }
    } catch {}

    const initial = getTimeLeft();
    if (!initial) return; // Sudah expired — tidak tampilkan

    setTimeLeft(initial);
    setVisible(true);

    const interval = setInterval(() => {
      const tl = getTimeLeft();
      if (!tl) {
        clearInterval(interval);
        setVisible(false); // Auto-hide saat habis
        return;
      }
      setTimeLeft(tl);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {}
    setVisible(false);
    setDismissed(true);
  };

  if (dismissed || !visible || !timeLeft) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-[55] overflow-hidden"
        >
          <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 py-2.5 px-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
              {/* Label */}
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>🎉 Pre-Launch Bonus berakhir dalam:</span>
              </div>

              {/* Countdown */}
              <div className="flex items-end gap-2">
                <TimeUnit value={timeLeft.days} label="hari" />
                <span className="text-white/80 font-bold text-lg mb-5">:</span>
                <TimeUnit value={timeLeft.hours} label="jam" />
                <span className="text-white/80 font-bold text-lg mb-5">:</span>
                <TimeUnit value={timeLeft.minutes} label="menit" />
                <span className="text-white/80 font-bold text-lg mb-5">:</span>
                <TimeUnit value={timeLeft.seconds} label="detik" />
              </div>

              {/* CTA */}
              <a
                href="#harga"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('harga')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm font-bold text-white underline underline-offset-2 hover:no-underline whitespace-nowrap"
              >
                Klaim Bonus →
              </a>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              aria-label="Tutup banner"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
