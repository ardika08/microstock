import React from 'react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { ArrowRight, Sparkles, FileText, Tags } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Left: Headline + CTA */}
          <div className="flex flex-col justify-center">
            <Badge className="w-fit mb-6 bg-blue-100 text-blue-700 hover:bg-blue-100">
              <Sparkles className="w-3 h-3 mr-1" />
              Powered by AI Technology
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Otomasi Metadata Microstock dalam
              <span className="text-blue-600"> Hitungan Detik</span>
            </h1>
            
            <p className="mt-6 text-lg text-gray-600 max-w-2xl">
              Hemat waktu hingga 95% dengan AI yang menghasilkan judul, deskripsi, dan keyword berkualitas tinggi untuk gambar microstock Anda secara otomatis.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Mulai Gratis - 20 Kredit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Lihat Demo
              </Button>
            </div>
            
            <div className="mt-8 flex items-center gap-8">
              <div>
                <p className="text-2xl font-bold text-gray-900">10,000+</p>
                <p className="text-sm text-gray-600">Gambar Diproses</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">95%</p>
                <p className="text-sm text-gray-600">Hemat Waktu</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">4.9/5</p>
                <p className="text-sm text-gray-600">Rating Pengguna</p>
              </div>
            </div>
          </div>
          
          {/* Right: Extension Mockup */}
          <div className="relative">
            <div className="relative mx-auto w-full max-w-lg">
              {/* Mockup Container */}
              <div className="rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
                {/* Chrome Extension Header */}
                <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-600">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Autofillstock</span>
                </div>
                
                {/* Extension Content */}
                <div className="p-6 space-y-4">
                  {/* Image Preview */}
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-600">sunset-beach.jpg</p>
                    </div>
                  </div>
                  
                  {/* Generated Metadata */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Judul</label>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-gray-900 font-medium">Beautiful sunset over tropical beach with palm trees</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        <Tags className="w-3 h-3" />
                        Keywords (30)
                      </label>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex flex-wrap gap-1">
                          {['sunset', 'beach', 'tropical', 'palm trees', 'ocean', 'vacation', 'paradise', 'summer'].map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                              {tag}
                            </span>
                          ))}
                          <span className="px-2 py-0.5 bg-gray-300 text-gray-700 text-xs rounded-full">+22</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Export ke Platform
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -right-4 -top-4 animate-pulse">
                <div className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold">
                  ✨ AI Generated
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
