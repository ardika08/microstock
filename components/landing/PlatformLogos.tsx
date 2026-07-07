import React from 'react';
import { motion } from 'framer-motion';

export function PlatformLogos() {
  const platforms = [
    { name: 'Shutterstock' },
    { name: 'Adobe Stock' },
    { name: 'Freepik' },
    { name: 'Dreamstime' },
    { name: 'iStock' },
  ];

  // Duplicate for seamless marquee
  const doubled = [...platforms, ...platforms];

  return (
    <section className="py-12 bg-slate-950 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          className="text-center text-sm font-medium text-gray-500 mb-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Kompatibel dengan platform microstock terpopuler
        </motion.p>

        <div className="overflow-hidden relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10" />

          <div className="flex animate-marquee">
            {doubled.map((platform, i) => (
              <div
                key={`${platform.name}-${i}`}
                className="flex-shrink-0 mx-8 transition-all duration-300 opacity-50 hover:opacity-100 grayscale hover:grayscale-0"
              >
                <div className="flex items-center justify-center h-12 text-gray-400 hover:text-blue-400 font-bold text-lg whitespace-nowrap transition-colors duration-300">
                  {platform.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
