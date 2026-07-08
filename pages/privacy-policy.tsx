import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, ArrowLeft } from 'lucide-react'

const sections = [
  {
    id: 'informasi',
    title: '1. Informasi yang Kami Kumpulkan',
    content: (
      <>
        <p>
          Kami mengumpulkan informasi berikut ketika kamu menggunakan layanan Autofillstock:
        </p>
        <ul>
          <li>
            <strong className="text-gray-300">Informasi Akun</strong> — alamat email dan nama
            lengkap yang diperoleh melalui proses autentikasi Google OAuth saat kamu mendaftar atau
            masuk ke layanan.
          </li>
          <li>
            <strong className="text-gray-300">Riwayat Generate</strong> — metadata yang pernah
            kamu generate melalui ekstensi, termasuk judul, deskripsi, dan kata kunci, beserta
            timestamp-nya. Data ini digunakan untuk menampilkan riwayat aktivitasmu di dashboard.
          </li>
          <li>
            <strong className="text-gray-300">Data Pembayaran</strong> — informasi transaksi seperti
            paket yang dipilih, jumlah pembayaran, dan status transaksi. Kami tidak menyimpan data
            kartu kredit atau rekening bank secara langsung; pembayaran diproses melalui gateway
            pembayaran Mayar.
          </li>
          <li>
            <strong className="text-gray-300">Data Penggunaan</strong> — jumlah kredit yang
            digunakan, tanggal penggunaan, dan jenis paket yang aktif.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'penggunaan',
    title: '2. Cara Kami Menggunakan Informasi',
    content: (
      <>
        <p>Informasi yang kami kumpulkan digunakan untuk tujuan-tujuan berikut:</p>
        <ul>
          <li>
            <strong className="text-gray-300">Personalisasi Layanan</strong> — menampilkan nama,
            riwayat generate, serta sisa kredit di dashboard pribadimu.
          </li>
          <li>
            <strong className="text-gray-300">Billing dan Manajemen Langganan</strong> —
            memproses pembayaran, memverifikasi status langganan, dan mengirim notifikasi terkait
            akun atau transaksi.
          </li>
          <li>
            <strong className="text-gray-300">Peningkatan Produk</strong> — menganalisis pola
            penggunaan secara agregat (tanpa mengidentifikasi individu) untuk meningkatkan kualitas
            dan performa layanan.
          </li>
          <li>
            <strong className="text-gray-300">Keamanan dan Pencegahan Penyalahgunaan</strong> —
            mendeteksi aktivitas mencurigakan dan melindungi integritas layanan.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'penyimpanan',
    title: '3. Penyimpanan Data',
    content: (
      <>
        <p>
          Semua data pengguna disimpan di database <strong className="text-gray-300">PostgreSQL
          Neon</strong> yang berlokasi di server <strong className="text-gray-300">Singapore
          (Asia-Pacific)</strong>. Kami memilih lokasi ini untuk memastikan latensi rendah bagi
          pengguna di Indonesia dan Asia Tenggara.
        </p>
        <p>
          Data disimpan dalam kondisi terenkripsi, baik saat dalam penyimpanan (at rest) maupun
          saat ditransmisikan (in transit). Kami menerapkan enkripsi standar industri untuk
          melindungi informasimu dari akses yang tidak sah.
        </p>
        <p>
          Data akunmu akan kami simpan selama akun masih aktif. Jika kamu meminta penghapusan
          akun, data akan dihapus dalam waktu 30 hari kerja.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: '4. Berbagi Data dengan Pihak Ketiga',
    content: (
      <>
        <p>
          Kami <strong className="text-gray-300">tidak menjual, menyewakan, atau
          memperdagangkan</strong> data pribadimu kepada pihak ketiga mana pun untuk tujuan
          komersial.
        </p>
        <p>
          Data hanya dibagikan kepada pihak berikut semata-mata untuk keperluan operasional layanan:
        </p>
        <ul>
          <li>
            <strong className="text-gray-300">OpenAI</strong> — konten gambar atau teks yang kamu
            kirim melalui ekstensi diteruskan ke API OpenAI untuk proses generate metadata. OpenAI
            tunduk pada kebijakan privasi mereka sendiri yang dapat dilihat di{' '}
            <a
              href="https://openai.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              openai.com/privacy
            </a>
            .
          </li>
          <li>
            <strong className="text-gray-300">Mayar</strong> — platform pembayaran yang kami gunakan
            untuk memproses transaksi Top Up dan langganan. Data transaksi yang dibagikan hanya
            mencakup informasi yang diperlukan untuk verifikasi pembayaran.
          </li>
        </ul>
        <p>
          Kami dapat mengungkapkan informasi jika diwajibkan oleh hukum yang berlaku di Indonesia
          atau atas permintaan otoritas hukum yang berwenang.
        </p>
      </>
    ),
  },
  {
    id: 'keamanan',
    title: '5. Keamanan Data',
    content: (
      <>
        <p>Kami menerapkan langkah-langkah keamanan berlapis untuk melindungi datamu:</p>
        <ul>
          <li>
            <strong className="text-gray-300">HTTPS</strong> — seluruh komunikasi antara browser,
            ekstensi, dan server menggunakan protokol HTTPS dengan TLS untuk mencegah penyadapan
            data.
          </li>
          <li>
            <strong className="text-gray-300">Enkripsi Database</strong> — data sensitif
            dienkripsi sebelum disimpan di database menggunakan algoritma enkripsi standar
            industri.
          </li>
          <li>
            <strong className="text-gray-300">Access Control</strong> — akses ke sistem produksi
            dibatasi hanya untuk personel yang berwenang dengan autentikasi yang kuat. Setiap akses
            ke data sensitif dicatat dan dipantau.
          </li>
          <li>
            <strong className="text-gray-300">Session Management</strong> — sesi login dikelola
            secara aman menggunakan token yang dirotasi secara berkala.
          </li>
        </ul>
        <p>
          Meskipun kami berusaha sebaik mungkin untuk melindungi datamu, tidak ada sistem yang
          sepenuhnya bebas risiko. Kami akan memberitahukanmu sesegera mungkin jika terjadi
          insiden keamanan yang berdampak pada datamu.
        </p>
      </>
    ),
  },
  {
    id: 'hak',
    title: '6. Hak Pengguna',
    content: (
      <>
        <p>Sebagai pengguna, kamu memiliki hak-hak berikut atas data pribadimu:</p>
        <ul>
          <li>
            <strong className="text-gray-300">Hak Akses</strong> — kamu dapat meminta salinan data
            pribadi yang kami simpan tentangmu kapan saja.
          </li>
          <li>
            <strong className="text-gray-300">Hak Koreksi</strong> — jika ada data yang tidak
            akurat atau tidak lengkap, kamu dapat meminta kami untuk memperbaikinya.
          </li>
          <li>
            <strong className="text-gray-300">Hak Penghapusan</strong> — kamu dapat meminta
            penghapusan akun dan seluruh data pribadimu. Permintaan ini akan diproses dalam 30 hari
            kerja.
          </li>
          <li>
            <strong className="text-gray-300">Hak Portabilitas</strong> — kamu dapat meminta ekspor
            data riwayat generate dalam format yang dapat dibaca mesin.
          </li>
        </ul>
        <p>
          Untuk menggunakan hak-hak di atas, hubungi kami di{' '}
          <a
            href="mailto:support@autofillstock.my.id"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
          >
            support@autofillstock.my.id
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'cookie',
    title: '7. Cookie',
    content: (
      <>
        <p>
          Autofillstock menggunakan cookie secara terbatas dan hanya untuk keperluan fungsional:
        </p>
        <ul>
          <li>
            <strong className="text-gray-300">Session Cookie</strong> — digunakan untuk menjaga
            sesi login kamu tetap aktif selama menggunakan layanan. Cookie ini bersifat sementara
            dan akan dihapus otomatis saat sesi berakhir atau browser ditutup.
          </li>
        </ul>
        <p>
          Kami <strong className="text-gray-300">tidak menggunakan</strong> tracking cookie,
          advertising cookie, atau cookie analitik pihak ketiga yang melacak aktivitasmu di luar
          layanan Autofillstock. Kami tidak menjalankan iklan bertarget berdasarkan perilaku
          pengguna.
        </p>
      </>
    ),
  },
  {
    id: 'perubahan',
    title: '8. Perubahan Kebijakan',
    content: (
      <>
        <p>
          Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu untuk mencerminkan
          perubahan pada layanan, teknologi, atau persyaratan hukum yang berlaku.
        </p>
        <p>
          Jika terjadi perubahan yang signifikan, kami akan memberitahukanmu melalui email yang
          terdaftar atau melalui pemberitahuan yang ditampilkan di dashboard setidaknya 7 hari
          sebelum perubahan berlaku.
        </p>
        <p>
          Penggunaan layanan yang berkelanjutan setelah perubahan kebijakan dianggap sebagai
          persetujuanmu terhadap kebijakan yang diperbarui. Tanggal &ldquo;Terakhir
          Diperbarui&rdquo; di bagian atas halaman ini akan selalu mencerminkan versi terkini.
        </p>
      </>
    ),
  },
  {
    id: 'kontak',
    title: '9. Kontak',
    content: (
      <>
        <p>
          Jika kamu memiliki pertanyaan, kekhawatiran, atau permintaan terkait kebijakan privasi
          ini atau pengelolaan data pribadimu, silakan hubungi kami:
        </p>
        <ul>
          <li>
            <strong className="text-gray-300">Email</strong>:{' '}
            <a
              href="mailto:support@autofillstock.my.id"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              support@autofillstock.my.id
            </a>
          </li>
          <li>
            <strong className="text-gray-300">Pengelola</strong>: Grafista Digital
          </li>
        </ul>
        <p>Kami berkomitmen untuk merespons setiap pertanyaan dalam waktu 3 hari kerja.</p>
      </>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>Kebijakan Privasi | Autofillstock</title>
        <meta
          name="description"
          content="Kebijakan Privasi Autofillstock — bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadimu."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-950 text-gray-100">
        {/* Navbar */}
        <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Autofillstock
              </span>
            </Link>

            {/* Back link */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Page header */}
            <div className="mb-12">
              <h1 className="text-3xl font-bold text-gray-100 mb-3">Kebijakan Privasi</h1>
              <p className="text-gray-500 text-sm">
                Tanggal Efektif: <span className="text-gray-400">7 Juli 2026</span>
              </p>
              <p className="text-gray-400 leading-relaxed mt-4">
                Autofillstock, yang dikelola oleh Grafista Digital, berkomitmen untuk melindungi
                privasi pengguna. Kebijakan ini menjelaskan jenis informasi yang kami kumpulkan,
                bagaimana kami menggunakannya, dan langkah-langkah yang kami ambil untuk
                melindunginya.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-10">
              {sections.map((section, i) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 * i, ease: 'easeOut' }}
                >
                  <h2 className="text-xl font-semibold text-gray-100 pb-3 mb-4 border-b border-white/10">
                    {section.title}
                  </h2>
                  <div className="text-gray-400 leading-relaxed space-y-3 [&_ul]:mt-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:marker:text-blue-500/60">
                    {section.content}
                  </div>
                </motion.section>
              ))}
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 mt-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} Autofillstock. Hak cipta dilindungi undang-undang.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">
                Kebijakan Privasi
              </Link>
              <Link href="/terms-of-service" className="hover:text-gray-400 transition-colors">
                Syarat &amp; Ketentuan
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
