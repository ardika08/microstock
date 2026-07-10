import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Check, Zap, TrendingUp, BarChart2, Crown } from 'lucide-react';

export function Pricing() {
  const plans = [
    {
      name: 'Free Trial',
      price: 'Gratis',
      originalPrice: '',
      period: '',
      credits: '20 kredit 🎁 (bonus pre-launch!)',
      description: 'Coba fitur lengkap tanpa kartu kredit',
      features: [
        '20 kredit gratis',
        'Export CSV',
        'Support semua platform',
        'Kredit tidak expire',
      ],
      icon: Zap,
      color: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-400',
      buttonClass: 'border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white',
      buttonText: 'Mulai Gratis',
      planKey: 'free',
      popular: false,
      promo: false,
    },
    {
      name: 'Intro Pack',
      price: 'Rp9.900',
      originalPrice: '',
      period: '',
      credits: '150 kredit 🎁 (harga intro pre-launch!)',
      description: 'Mulai dari harga termurah, kredit tidak expire',
      features: [
        '150 kredit (tidak expire)',
        'Top-up kapan saja',
        'Cocok untuk pemula',
        'Tanpa komitmen bulanan',
      ],
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      iconColor: 'text-emerald-400',
      buttonClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0',
      buttonText: 'Beli Sekarang',
      planKey: 'intro',
      popular: true,
      promo: true,
    },
    {
      name: 'Basic Pack',
      price: 'Rp25.000',
      originalPrice: '',
      period: '',
      credits: '450 kredit',
      description: 'Nilai lebih hemat per kredit, untuk yang aktif upload',
      features: [
        '450 kredit (tidak expire)',
        'Top-up kapan saja',
        'Hemat ~Rp56/kredit',
        'Tanpa komitmen bulanan',
      ],
      icon: BarChart2,
      color: 'from-blue-500 to-cyan-400',
      iconColor: 'text-blue-400',
      buttonClass: 'border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white',
      buttonText: 'Beli Kredit',
      planKey: 'basic',
      popular: false,
      promo: false,
    },
    {
      name: 'Value Pack',
      price: 'Rp50.000',
      originalPrice: '',
      period: '',
      credits: '1.200 kredit',
      description: 'Paling hemat per kredit, untuk contributor produktif',
      features: [
        '1.200 kredit (tidak expire)',
        'Top-up kapan saja',
        'Hemat ~Rp42/kredit',
        'Tanpa komitmen bulanan',
      ],
      icon: BarChart2,
      color: 'from-purple-500 to-purple-600',
      iconColor: 'text-purple-400',
      buttonClass: 'border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white',
      buttonText: 'Beli Kredit',
      planKey: 'value',
      popular: false,
      promo: false,
    },
  ];

  return (
    <section id="harga" className="py-20 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block mb-4 px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Harga
          </span>
          <h2 className="text-3xl font-bold text-gray-100 sm:text-4xl">
            Bayar Sesuai Pakai
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Tidak ada biaya bulanan. Beli kredit, pakai kapanpun. Kredit tidak pernah hangus.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-4 max-w-7xl mx-auto mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              className={`relative group rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 ${
                plan.popular
                  ? 'bg-slate-900/80 backdrop-blur-xl border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/50 backdrop-blur-sm border border-white/10 hover:border-white/20'
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/25">
                    🔥 Terlaris
                  </span>
                </div>
              )}

              {plan.promo && (
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-lg shadow-red-500/25">
                    Harga Intro
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} p-[1px] mb-4`}>
                  <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center">
                    <plan.icon className={`w-6 h-6 ${plan.iconColor}`} />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-100">{plan.name}</h3>

                <div className="mt-4 flex items-baseline gap-2">
                  {plan.originalPrice && (
                    <span className="text-lg text-gray-500 line-through">{plan.originalPrice}</span>
                  )}
                  <span className="text-4xl font-bold text-gray-100">{plan.price}</span>
                </div>

                <p className="text-sm font-medium text-emerald-400 mt-2">{plan.credits}</p>
                <p className="text-sm text-gray-400 mt-2">{plan.description}</p>

                {/* Features */}
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`w-full mt-8 ${plan.buttonClass}`}
                  size="lg"
                >
                  <Link href={`/auth/login?plan=${plan.planKey}`}>
                    {plan.buttonText}
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* One-time Purchase Banner */}
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 p-8 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-[1px]">
                    <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-100">One-time Purchase</h3>
                    <p className="text-sm text-purple-400 font-medium">Unlimited selamanya</p>
                  </div>
                </div>
                <p className="text-gray-400">Bayar sekali, generate unlimited selamanya. Pakai API key OpenAI sendiri.</p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg text-gray-500 line-through">Rp349.000</span>
                    <span className="text-3xl font-bold text-gray-100">Rp249.000</span>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Harga Promo
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">Pakai API key sendiri</span>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">Tidak ada biaya bulanan</span>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">Update gratis selamanya</span>
                </div>
              </div>
              <Button size="lg" asChild className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-purple-500/25 whitespace-nowrap">
                <Link href="/auth/login?plan=onetime">Beli Sekarang</Link>
              </Button>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Semua paket termasuk update gratis. Kredit tidak pernah expire.
        </p>
      </div>
    </section>
  );
}
