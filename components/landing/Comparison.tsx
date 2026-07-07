import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export function Comparison() {
  const comparisons = [
    {
      category: 'Waktu per 10 gambar',
      manual: '30 menit',
      autofillstock: '2 menit',
    },
    {
      category: 'Konsistensi kualitas',
      manual: 'Tidak konsisten',
      autofillstock: 'Selalu konsisten',
    },
    {
      category: 'SEO Score',
      manual: '60-70%',
      autofillstock: '85-95%',
    },
    {
      category: 'Approval Rate',
      manual: '70-80%',
      autofillstock: '90-95%',
    },
    {
      category: 'Keyword Research',
      manual: 'Manual & lama',
      autofillstock: 'Otomatis & instant',
    },
    {
      category: 'Batch Processing',
      manual: 'Tidak tersedia',
      autofillstock: 'Hingga 50 gambar',
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
          <span className="inline-block mb-4 px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Perbandingan
          </span>
          <h2 className="text-3xl font-bold text-gray-100 sm:text-4xl">
            Manual vs Autofillstock
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Lihat perbedaan signifikan dalam efisiensi dan kualitas output
          </p>
        </motion.div>

        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Glassmorphism card wrapper */}
          <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 font-semibold text-gray-200">Fitur</th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-200">
                      <div className="flex flex-col items-center gap-1">
                        <X className="w-5 h-5 text-red-400" />
                        <span>Manual</span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-200 bg-blue-500/10">
                      <div className="flex flex-col items-center gap-1">
                        <Check className="w-5 h-5 text-emerald-400" />
                        <span>Autofillstock</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((item, index) => (
                    <tr
                      key={index}
                      className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                        index % 2 === 0 ? 'bg-slate-800/30' : 'bg-transparent'
                      }`}
                    >
                      <td className="py-4 px-6 font-medium text-gray-200">
                        {item.category}
                      </td>
                      <td className="py-4 px-6 text-center text-gray-400">
                        {item.manual}
                      </td>
                      <td className="py-4 px-6 text-center bg-blue-500/5">
                        <span className="font-semibold text-emerald-400">
                          {item.autofillstock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <motion.div
            className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl backdrop-blur-sm"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300 mb-1">
                  Hemat Waktu hingga 95%
                </p>
                <p className="text-emerald-400/80 text-sm">
                  Fokus pada kreativitas Anda, biarkan AI menangani metadata yang membosankan
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
