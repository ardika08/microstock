import React from 'react'
import Head from 'next/head'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Sparkles, Gift } from 'lucide-react'

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Masuk | Autofillstock</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        {/* Ambient background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">

            {/* Logo + brand */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Autofillstock
              </h1>
              <p className="text-gray-400 text-sm mt-2 text-center leading-relaxed">
                Masuk untuk mulai generate metadata microstock
              </p>
            </div>

            {/* Google sign-in button */}
            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Google SVG icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Lanjutkan dengan Google
            </button>

            {/* Terms notice */}
            <p className="text-center text-xs text-gray-500 mt-4 leading-relaxed">
              Dengan masuk, kamu menyetujui{' '}
              <span className="text-gray-400 underline underline-offset-2 cursor-pointer hover:text-gray-300 transition-colors">
                Syarat &amp; Ketentuan
              </span>{' '}
              dan{' '}
              <span className="text-gray-400 underline underline-offset-2 cursor-pointer hover:text-gray-300 transition-colors">
                Kebijakan Privasi
              </span>{' '}
              kami
            </p>
          </div>

          {/* Free trial badge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-400"
          >
            <Gift className="w-4 h-4 flex-shrink-0" />
            <span>Daftar gratis, dapat <strong>20 kredit</strong> untuk langsung dicoba</span>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
