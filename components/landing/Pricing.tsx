import React from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Check, Zap, TrendingUp, Crown } from 'lucide-react';

export function Pricing() {
  const plans = [
    {
      name: 'Free Trial',
      price: 'Gratis',
      period: '',
      credits: '20 kredit',
      description: 'Coba fitur lengkap tanpa kartu kredit',
      features: [
        '20 kredit gratis',
        'AI metadata generation',
        'Export CSV',
        'Platform support lengkap',
        'Email support',
      ],
      icon: Zap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      buttonVariant: 'outline' as const,
      buttonText: 'Mulai Gratis',
    },
    {
      name: 'Starter',
      price: 'Rp99.000',
      period: '/bulan',
      credits: '1.000 kredit/bulan',
      description: 'Untuk contributor yang konsisten',
      features: [
        '1.000 kredit per bulan',
        'Rollover kredit tidak terpakai',
        'Batch processing (50 gambar)',
        'Priority support',
        'Analisis performa',
        'API access',
      ],
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      buttonVariant: 'default' as const,
      buttonText: 'Mulai Sekarang',
      badge: 'Most Popular',
      promo: 'Harga Promo',
    },
    {
      name: 'Pay as You Go',
      price: 'Rp50.000',
      period: '',
      credits: '500 kredit',
      description: 'Beli kredit sesuai kebutuhan',
      features: [
        '500 kredit one-time',
        'Kredit tidak expire',
        'Top-up kapan saja',
        'Hemat untuk usage rendah',
        'Semua fitur premium',
      ],
      icon: Crown,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      buttonVariant: 'outline' as const,
      buttonText: 'Beli Kredit',
    },
  ];

  const enterprise = {
    name: 'One-time Purchase',
    price: 'Rp249.000',
    credits: '3.000 kredit',
    description: 'Hemat lebih dengan paket besar',
    promo: 'Harga Promo',
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-700">Harga</Badge>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Pilih Paket yang Sesuai
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Mulai gratis, upgrade kapan saja. Tanpa kontrak, cancel kapan saja.
          </p>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-3 max-w-7xl mx-auto mb-12">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative ${plan.badge ? 'border-2 border-blue-600 shadow-xl scale-105' : 'border-gray-200'}`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-4 py-1">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              {plan.promo && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-red-500 text-white px-3 py-1 shadow-md">
                    {plan.promo}
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${plan.bgColor} flex items-center justify-center mb-4`}>
                  <plan.icon className={`w-6 h-6 ${plan.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-600">{plan.period}</span>}
                </div>
                <p className="text-sm font-medium text-blue-600 mt-2">{plan.credits}</p>
                <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full"
                  variant={plan.buttonVariant}
                  size="lg"
                >
                  {plan.buttonText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* One-time Purchase Banner */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-purple-600 bg-gradient-to-r from-purple-50 to-blue-50 relative overflow-hidden">
            <div className="absolute -top-2 -right-2">
              <Badge className="bg-red-500 text-white px-3 py-1 shadow-md">
                {enterprise.promo}
              </Badge>
            </div>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{enterprise.name}</h3>
                      <p className="text-sm text-purple-600 font-medium">{enterprise.credits}</p>
                    </div>
                  </div>
                  <p className="text-gray-600">{enterprise.description}</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div>
                      <span className="text-3xl font-bold text-gray-900">{enterprise.price}</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      Hemat 17%
                    </Badge>
                  </div>
                </div>
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
                  Beli Sekarang
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-8">
          Semua paket termasuk update gratis dan tanpa biaya tersembunyi
        </p>
      </div>
    </section>
  );
}
