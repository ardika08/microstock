import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

const errorMessages: Record<string, string> = {
  Configuration: 'Terjadi kesalahan konfigurasi server.',
  AccessDenied: 'Akses ditolak. Kamu tidak memiliki izin untuk masuk.',
  Verification: 'Token verifikasi tidak valid atau sudah kadaluarsa.',
  Default: 'Terjadi kesalahan saat mencoba masuk. Silakan coba lagi.',
}

export default function AuthErrorPage() {
  const router = useRouter()
  const errorCode = (router.query.error as string) ?? 'Default'
  const message = errorMessages[errorCode] ?? errorMessages.Default

  return (
    <>
      <Head>
        <title>Error Autentikasi | Autofillstock</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40 text-center">
            {/* Error icon */}
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>

            <h1 className="text-xl font-bold text-gray-100 mb-2">
              Autentikasi Gagal
            </h1>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              {message}
            </p>

            {errorCode !== 'Default' && (
              <p className="text-xs text-gray-600 bg-slate-800 rounded-lg px-3 py-2 mb-6 font-mono">
                Error: {errorCode}
              </p>
            )}

            <button
              onClick={() => router.push('/auth/login')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Halaman Masuk
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}
