import React from 'react';

export function PlatformLogos() {
  const platforms = [
    { name: 'Shutterstock', width: 140 },
    { name: 'Adobe Stock', width: 120 },
    { name: 'Freepik', width: 100 },
    { name: 'Dreamstime', width: 130 },
    { name: 'iStock', width: 90 },
  ];

  return (
    <section className="py-12 bg-white border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-gray-500 mb-8">
          Kompatibel dengan platform microstock terpopuler
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="transition-all duration-300 grayscale hover:grayscale-0 opacity-60 hover:opacity-100"
              style={{ width: platform.width }}
            >
              <div className="flex items-center justify-center h-12 text-gray-700 font-bold text-lg">
                {platform.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
