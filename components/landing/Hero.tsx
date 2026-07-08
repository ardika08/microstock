import React, { useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { ArrowRight, Sparkles, FileText, Tags } from 'lucide-react';

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0 });
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  // Fallback: jika IntersectionObserver tidak fire dalam 1.5s, mulai animasi
  useEffect(() => {
    const fallback = setTimeout(() => setStarted(true), 1500);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!isInView && !started) return;
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, started, target]);

  return (
    <span ref={ref} aria-label={`${target.toLocaleString()}${suffix}`}>
      <span aria-hidden="true">{count.toLocaleString()}{suffix}</span>
    </span>
  );
}

const headlineText = 'Otomasi Metadata Microstock dalam Hitungan Detik';

function TypewriterHeadline() {
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayedChars, setDisplayedChars] = useState(0);

  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    let i = 0;
    function typeNext() {
      if (i >= headlineText.length) {
        setDone(true);
        return;
      }
      i++;
      setDisplayedChars(i);
      const char = headlineText[i - 1];
      const delay = char === ' ' ? 60 : 45 + Math.random() * 20;
      setTimeout(typeNext, delay);
    }
    const timer = setTimeout(typeNext, 300);
    return () => clearInterval(timer);
  }, [isInView]);

  const displayed = headlineText.slice(0, displayedChars);
  const splitIndex = displayed.indexOf('Hitungan Detik');
  const hasHighlight = splitIndex !== -1;

  return (
    <h1
      ref={ref}
      className="text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl md:text-6xl"
    >
      {hasHighlight ? (
        <>
          {displayed.slice(0, splitIndex)}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            {displayed.slice(splitIndex)}
          </span>
        </>
      ) : (
        displayed
      )}
      {!done && (
        <span className="animate-pulse text-blue-400" aria-hidden="true">|</span>
      )}
    </h1>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-blue-950/30 to-slate-950 py-20 sm:py-32">
      {/* Dot pattern background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Left: Headline + CTA */}
          <motion.div
            className="flex flex-col justify-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Badge className="w-fit mb-6 bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Powered by AI Technology
            </Badge>

            <TypewriterHeadline />

            <p className="mt-6 text-lg text-gray-400 max-w-2xl">
              Hemat waktu hingga 95% dengan AI yang menghasilkan judul, deskripsi, dan keyword berkualitas tinggi untuk gambar microstock Anda secara otomatis.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/25">
                <Link href="/auth/signin">
                  Mulai Gratis - 20 Kredit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
                onClick={() => {
                  const el = document.getElementById('fitur');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Lihat Demo
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-8">
              <div>
                <p className="text-2xl font-bold text-gray-100">
                  <AnimatedCounter target={10000} suffix="+" />
                </p>
                <p className="text-sm text-gray-400">Gambar Diproses</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">
                  <AnimatedCounter target={95} suffix="%" />
                </p>
                <p className="text-sm text-gray-400">Hemat Waktu</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">
                  4.9/5
                </p>
                <p className="text-sm text-gray-400">Rating Pengguna</p>
              </div>
            </div>
          </motion.div>

          {/* Right: Extension Mockup */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative mx-auto w-full max-w-lg">
              {/* Glow behind card */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 rounded-3xl blur-xl" />

              {/* Mockup Container */}
              <div className="relative rounded-2xl bg-slate-900/80 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden">
                {/* Chrome Extension Header */}
                <div className="bg-slate-800/80 border-b border-white/10 px-4 py-3 flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-400">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-200">Autofillstock</span>
                </div>

                {/* Extension Content */}
                <div className="p-6 space-y-4">
                  {/* Image Preview */}
                  <div className="aspect-video bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg flex items-center justify-center border border-white/5">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-sm text-gray-400">sunset-beach.jpg</p>
                    </div>
                  </div>

                  {/* Generated Metadata */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Judul</label>
                      <div className="bg-slate-800/60 border border-white/10 rounded-lg p-3">
                        <p className="text-sm text-gray-200 font-medium">Beautiful sunset over tropical beach with palm trees</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        <Tags className="w-3 h-3" />
                        Keywords (30)
                      </label>
                      <div className="bg-slate-800/60 border border-white/10 rounded-lg p-3">
                        <div className="flex flex-wrap gap-1">
                          {['sunset', 'beach', 'tropical', 'palm trees', 'ocean', 'vacation', 'paradise', 'summer'].map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-xs rounded-full border border-blue-500/20">
                              {tag}
                            </span>
                          ))}
                          <span className="px-2 py-0.5 bg-slate-700 text-gray-400 text-xs rounded-full">+22</span>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0">
                      Export ke Platform
                    </Button>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div
                className="absolute -right-4 -top-4"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-white px-4 py-2 rounded-full shadow-lg shadow-emerald-500/25 text-sm font-bold">
                  ✨ AI Generated
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
