import React from 'react';
import { Button } from '~/components/ui/button';
import { Zap } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Autofillstock</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:inline-flex">
              Fitur
            </Button>
            <Button variant="ghost" className="hidden sm:inline-flex">
              Harga
            </Button>
            <Button variant="outline">
              Login
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
