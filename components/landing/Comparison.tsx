import React from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '~/components/ui/badge';

export function Comparison() {
  const comparisons = [
    {
      category: 'Waktu per 10 gambar',
      manual: '30 menit',
      autofillstock: '2 menit',
      better: 'autofillstock',
    },
    {
      category: 'Konsistensi kualitas',
      manual: 'Tidak konsisten',
      autofillstock: 'Selalu konsisten',
      better: 'autofillstock',
    },
    {
      category: 'SEO Score',
      manual: '60-70%',
      autofillstock: '85-95%',
      better: 'autofillstock',
    },
    {
      category: 'Approval Rate',
      manual: '70-80%',
      autofillstock: '90-95%',
      better: 'autofillstock',
    },
    {
      category: 'Keyword Research',
      manual: 'Manual & lama',
      autofillstock: 'Otomatis & instant',
      better: 'autofillstock',
    },
    {
      category: 'Batch Processing',
      manual: 'Tidak tersedia',
      autofillstock: 'Hingga 50 gambar',
      better: 'autofillstock',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-700">Perbandingan</Badge>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Manual vs Autofillstock
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Lihat perbedaan signifikan dalam efisiensi dan kualitas output
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Fitur</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">
                    <div className="flex flex-col items-center gap-1">
                      <X className="w-5 h-5 text-red-500" />
                      <span>Manual</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900 bg-blue-50 rounded-t-lg">
                    <div className="flex flex-col items-center gap-1">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Autofillstock</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">
                      {item.category}
                    </td>
                    <td className="py-4 px-6 text-center text-gray-600">
                      {item.manual}
                    </td>
                    <td className="py-4 px-6 text-center bg-blue-50">
                      <span className="font-semibold text-blue-700">
                        {item.autofillstock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 mb-1">
                  Hemat Waktu hingga 95%
                </p>
                <p className="text-green-700 text-sm">
                  Fokus pada kreativitas Anda, biarkan AI menangani metadata yang membosankan
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
