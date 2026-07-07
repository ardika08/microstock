import React, { useEffect, useState } from 'react';
import { ArrowUp, Zap } from 'lucide-react';
import { Button } from '~/components/ui/button';

export function FloatingCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling down 400px
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
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white border-t border-gray-200 shadow-lg px-4 py-3">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">
                Siap menghemat waktu upload Anda?
              </p>
              <p className="text-xs text-gray-500">Mulai gratis — 20 kredit, tanpa kartu kredit</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                size="sm"
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Zap className="w-4 h-4" />
                Mulai Gratis
              </Button>
              <Button size="sm" variant="outline" className="hidden sm:inline-flex">
                Lihat Harga
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll-to-top button */}
      <button
        onClick={scrollToTop}
        aria-label="Kembali ke atas"
        className={`fixed bottom-20 right-6 z-50 w-10 h-10 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all duration-300 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </>
  );
}
