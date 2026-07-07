import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Brain, FileText, Download } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Upload Gambar',
      description: 'Unggah gambar Anda ke extension atau drag & drop langsung dari browser',
      color: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-400',
    },
    {
      icon: Brain,
      title: 'AI Analisis',
      description: 'AI kami menganalisis konten visual dan konteks gambar secara mendalam',
      color: 'from-purple-500 to-purple-600',
      iconColor: 'text-purple-400',
    },
    {
      icon: FileText,
      title: 'Generate Metadata',
      description: 'Sistem menghasilkan judul, deskripsi, dan 50 keyword yang SEO-optimized',
      color: 'from-emerald-500 to-emerald-600',
      iconColor: 'text-emerald-400',
    },
    {
      icon: Download,
      title: 'Export & Upload',
      description: 'Export metadata dalam format CSV atau langsung upload ke platform microstock',
      color: 'from-orange-500 to-orange-600',
      iconColor: 'text-orange-400',
    },
  ];

  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-gray-100 sm:text-4xl">
            Cara Kerja
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Proses otomasi metadata yang sederhana dan cepat dalam 4 langkah mudah
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-500 via-emerald-500 to-orange-500 opacity-30 animate-gradient-x" />
          </div>

          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex flex-col items-center text-center group">
                {/* Step Number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-sm font-bold text-gray-300 z-10">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} p-[1px] mb-6 mt-4 group-hover:shadow-lg group-hover:shadow-blue-500/10 transition-all duration-300`}>
                  <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center">
                    <step.icon className={`w-10 h-10 ${step.iconColor}`} />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-100 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-400">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
