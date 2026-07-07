import React from 'react';
import { Upload, Brain, FileText, Download } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Upload Gambar',
      description: 'Unggah gambar Anda ke extension atau drag & drop langsung dari browser',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Brain,
      title: 'AI Analisis',
      description: 'AI kami menganalisis konten visual dan konteks gambar secara mendalam',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: FileText,
      title: 'Generate Metadata',
      description: 'Sistem menghasilkan judul, deskripsi, dan 50 keyword yang SEO-optimized',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Download,
      title: 'Export & Upload',
      description: 'Export metadata dalam format CSV atau langsung upload ke platform microstock',
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Cara Kerja
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Proses otomasi metadata yang sederhana dan cepat dalam 4 langkah mudah
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 relative">
          {/* Connection Lines (hidden on mobile) */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-orange-200 -z-10" style={{ width: '85%', left: '7.5%' }} />
          
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex flex-col items-center text-center">
                {/* Step Number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-sm font-bold text-gray-700 z-10">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl ${step.color} flex items-center justify-center mb-6 mt-4`}>
                  <step.icon className="w-10 h-10" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
