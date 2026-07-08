import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, ArrowLeft } from 'lucide-react'

const sections = [
  {
    id: 'penerimaan',
    title: '1. Penerimaan Syarat',
    content: (
      <>
        <p>
          Dengan mengakses atau menggunakan layanan Autofillstock — termasuk situs web, dashboard,
          dan ekstensi Chrome — kamu menyatakan bahwa kamu telah membaca, memahami, dan menyetujui
          untuk terikat oleh Syarat &amp; Ketentuan ini.
        </p>
        <p>
          Jika kamu tidak menyetujui syarat ini, harap hentikan penggunaan layanan kami. Usia
          minimum untuk menggunakan layanan ini adalah 17 tahun atau usia dewasa yang berlaku
          di wilayah hukummu.
        </p>
        <p>
          Syarat ini berlaku efektif mulai <strong className="text-gray-300">7 Juli 2026</strong>{' '}
          dan menggantikan semua versi sebelumnya.
        </p>
      </>
    ),
  },
  {
    id: 'deskripsi',
    title: '2. Deskripsi Layanan',
    content: (
      <>
        <p>
          Autofillstock adalah layanan berbasis SaaS yang terdiri dari:
        </p>
        <ul>
          <li>
            <strong className="text-gray-300">Ekstensi Chrome</strong> — alat yang dapat dipasang
            di browser Google Chrome untuk secara otomatis menganalisis gambar microstock dan
            men-generate metadata yang relevan, meliputi judul, deskripsi, dan kata kunci dalam
            Bahasa Inggris yang dioptimalkan untuk platform microstock.
          </li>
          <li>
            <strong className="text-gray-300">Dashboard Web</strong> — antarmuka berbasis web di{' '}
            <strong className="text-gray-300">autofillstock.my.id</strong> untuk mengelola akun,
            memantau penggunaan kredit, melihat riwayat generate, dan mengelola langganan.
          </li>
        </ul>
        <p>
          Layanan menggunakan teknologi kecerdasan buatan (AI) dari OpenAI untuk menghasilkan
          metadata. Kualitas output dapat bervariasi dan tidak ada jaminan bahwa metadata yang
          dihasilkan akan diterima oleh platform microstock tertentu.
        </p>
      </>
    ),
  },
  {
    id: 'akun',
    title: '3. Akun Pengguna',
    content: (
      <>
        <p>
          Untuk menggunakan Autofillstock, kamu harus memiliki akun yang dibuat melalui autentikasi{' '}
          <strong className="text-gray-300">Google OAuth</strong>. Dengan mendaftar, kamu
          memberikan izin kepada kami untuk mengakses nama dan alamat email Google-mu sesuai
          yang dijelaskan dalam Kebijakan Privasi kami.
        </p>
        <p>Sebagai pemegang akun, kamu bertanggung jawab untuk:</p>
        <ul>
          <li>
            Menjaga kerahasiaan akses ke akunmu dan tidak membagikannya kepada pihak lain.
          </li>
          <li>
            Semua aktivitas yang terjadi di bawah akunmu, baik yang kamu lakukan langsung maupun
            oleh pihak yang menggunakan akunmu.
          </li>
          <li>
            Segera menghubungi kami di{' '}
            <a
              href="mailto:support@autofillstock.my.id"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              support@autofillstock.my.id
            </a>{' '}
            jika kamu mencurigai adanya akses tidak sah ke akunmu.
          </li>
          <li>
            Memastikan informasi yang terkait dengan akunmu akurat dan terkini.
          </li>
        </ul>
        <p>
          Kami berhak menangguhkan atau menghapus akun yang melanggar syarat ini atau yang
          terlibat dalam aktivitas yang merugikan layanan atau pengguna lain.
        </p>
      </>
    ),
  },
  {
    id: 'pembayaran',
    title: '4. Paket dan Pembayaran',
    content: (
      <>
        <p>Autofillstock menawarkan beberapa pilihan paket sebagai berikut:</p>

        <div className="mt-4 space-y-4">
          {/* Free Trial */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-200">Free Trial</h3>
              <span className="text-emerald-400 font-semibold text-sm">Gratis</span>
            </div>
            <p className="text-sm leading-relaxed">
              Setiap pengguna baru mendapatkan <strong className="text-gray-300">20 kredit gratis</strong>{' '}
              secara otomatis saat pertama kali mendaftar. Kredit ini dapat langsung digunakan
              untuk mencoba layanan tanpa perlu melakukan pembayaran.
            </p>
          </div>

          {/* Top Up */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-200">Top Up Kredit</h3>
              <span className="text-blue-400 font-semibold text-sm">Rp 50.000 / 500 kredit</span>
            </div>
            <p className="text-sm leading-relaxed">
              Pembelian kredit satu kali sebesar Rp 50.000 untuk mendapatkan 500 kredit.{' '}
              <strong className="text-gray-300">Kredit tidak memiliki masa berlaku</strong> dan
              dapat digunakan kapan saja selama akun masih aktif. Cocok untuk pengguna dengan
              kebutuhan yang tidak menentu atau tidak terlalu sering.
            </p>
          </div>

          {/* Starter */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.05] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-200">Paket Starter</h3>
              <span className="text-blue-400 font-semibold text-sm">Rp 99.000 / bulan</span>
            </div>
            <p className="text-sm leading-relaxed">
              Langganan bulanan dengan akses <strong className="text-gray-300">unlimited</strong>{' '}
              generate metadata, dengan kebijakan fair use sebesar{' '}
              <strong className="text-gray-300">200 generate per hari</strong>. Ditagihkan setiap
              bulan. Langganan dapat dibatalkan kapan saja dan akan tetap aktif hingga akhir
              periode billing yang sudah dibayar.
            </p>
          </div>

          {/* One-time */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-200">One-time (Lifetime)</h3>
              <span className="text-purple-400 font-semibold text-sm">Rp 249.000</span>
            </div>
            <p className="text-sm leading-relaxed">
              Pembayaran satu kali untuk akses seumur hidup menggunakan{' '}
              <strong className="text-gray-300">API key OpenAI milikmu sendiri</strong>. Biaya
              API usage ditanggung langsung oleh pengguna melalui akun OpenAI pribadi. Cocok untuk
              pengguna dengan volume tinggi yang ingin kontrol penuh atas penggunaan API.
            </p>
          </div>
        </div>

        <p className="mt-4">
          Semua harga ditampilkan dalam Rupiah Indonesia (IDR) dan sudah termasuk PPN jika berlaku.
          Pembayaran diproses melalui platform Mayar. Kami berhak mengubah harga paket dengan
          pemberitahuan minimal 14 hari sebelum perubahan berlaku.
        </p>
      </>
    ),
  },
  {
    id: 'refund',
    title: '5. Kebijakan Refund',
    content: (
      <>
        <p>
          <strong className="text-gray-300">Semua pembelian bersifat final dan tidak dapat
          dikembalikan.</strong> Hal ini berlaku untuk semua jenis transaksi, termasuk Top Up
          kredit, paket Starter, dan pembelian One-time.
        </p>
        <p>
          Mengingat sifat layanan digital yang langsung dapat diakses dan digunakan setelah
          pembelian, kami tidak dapat menawarkan refund setelah transaksi selesai diproses.
        </p>
        <p>
          Pengecualian hanya berlaku dalam kondisi berikut:
        </p>
        <ul>
          <li>
            Terjadi double charge (pembayaran ganda) akibat kesalahan teknis pada sistem pembayaran.
          </li>
          <li>
            Layanan mengalami gangguan total (downtime) lebih dari 72 jam berturut-turut dan kami
            tidak dapat memberikan kompensasi berupa kredit tambahan.
          </li>
        </ul>
        <p>
          Untuk pengecualian di atas, hubungi kami di{' '}
          <a
            href="mailto:support@autofillstock.my.id"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
          >
            support@autofillstock.my.id
          </a>{' '}
          dengan menyertakan bukti transaksi dalam 7 hari sejak tanggal pembayaran.
        </p>
      </>
    ),
  },
  {
    id: 'dilarang',
    title: '6. Penggunaan yang Dilarang',
    content: (
      <>
        <p>
          Kamu dilarang menggunakan layanan Autofillstock untuk hal-hal berikut:
        </p>
        <ul>
          <li>
            <strong className="text-gray-300">Abuse dan Penyalahgunaan Kredit</strong> —
            mengeksploitasi sistem kredit, memanipulasi jumlah kredit, atau mencoba mendapatkan
            akses melebihi batas yang ditetapkan oleh paket yang dipilih.
          </li>
          <li>
            <strong className="text-gray-300">Spam</strong> — menggunakan layanan untuk
            menghasilkan konten dalam jumlah masif yang tidak wajar dalam waktu singkat dengan
            tujuan membanjiri platform microstock dengan konten berkualitas rendah.
          </li>
          <li>
            <strong className="text-gray-300">Reverse Engineering</strong> — mencoba untuk
            membongkar, mendekompilasi, atau merekayasa balik ekstensi Chrome, API, atau infrastruktur
            layanan Autofillstock.
          </li>
          <li>
            <strong className="text-gray-300">Berbagi Akun</strong> — membagikan akses akunmu
            kepada orang lain atau menggunakan satu akun untuk banyak pengguna secara bersamaan.
          </li>
          <li>
            <strong className="text-gray-300">Konten Ilegal</strong> — menggunakan layanan untuk
            menghasilkan metadata bagi konten yang melanggar hukum, hak cipta pihak ketiga, atau
            kebijakan platform microstock.
          </li>
          <li>
            <strong className="text-gray-300">Otomasi Tidak Sah</strong> — menggunakan bot, scraper,
            atau alat otomasi untuk mengakses layanan di luar penggunaan normal melalui ekstensi
            yang disediakan.
          </li>
        </ul>
        <p>
          Pelanggaran terhadap ketentuan ini dapat mengakibatkan penangguhan atau penghapusan akun
          secara permanen tanpa pengembalian dana.
        </p>
      </>
    ),
  },
  {
    id: 'hki',
    title: '7. Hak Kekayaan Intelektual',
    content: (
      <>
        <p>
          Seluruh kekayaan intelektual yang terkait dengan layanan Autofillstock — termasuk namun
          tidak terbatas pada kode sumber, desain antarmuka, logo, merek dagang, dan dokumentasi —
          adalah milik eksklusif <strong className="text-gray-300">Grafista Digital</strong> dan
          dilindungi oleh hukum hak cipta yang berlaku di Indonesia.
        </p>
        <p>
          Kamu diberikan lisensi terbatas, non-eksklusif, tidak dapat dipindahtangankan untuk
          menggunakan layanan semata-mata untuk keperluan pribadi dan non-komersial sesuai dengan
          Syarat &amp; Ketentuan ini.
        </p>
        <p>
          Metadata yang dihasilkan oleh layanan untuk gambarmu adalah milikmu. Namun, kami
          mempertahankan hak untuk menggunakan data penggunaan secara agregat dan anonim untuk
          tujuan peningkatan layanan.
        </p>
        <p>
          Kamu tidak diperbolehkan untuk mereproduksi, mendistribusikan, memodifikasi, atau
          membuat karya turunan dari aset layanan kami tanpa izin tertulis yang eksplisit dari
          Grafista Digital.
        </p>
      </>
    ),
  },
  {
    id: 'batasan',
    title: '8. Batasan Tanggung Jawab',
    content: (
      <>
        <p>
          Layanan Autofillstock disediakan &ldquo;sebagaimana adanya&rdquo; (<em>as-is</em>) dan
          &ldquo;sebagaimana tersedia&rdquo; (<em>as-available</em>) tanpa jaminan dalam bentuk
          apa pun, baik tersurat maupun tersirat.
        </p>
        <p>Kami tidak bertanggung jawab atas:</p>
        <ul>
          <li>
            Kualitas atau akurasi metadata yang dihasilkan oleh AI, termasuk apakah metadata
            tersebut akan diterima atau ditolak oleh platform microstock.
          </li>
          <li>
            Kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan
            atau ketidakmampuan menggunakan layanan.
          </li>
          <li>
            Gangguan layanan yang disebabkan oleh pemeliharaan, pembaruan sistem, atau kejadian
            di luar kendali kami (<em>force majeure</em>), termasuk gangguan pada layanan pihak
            ketiga seperti OpenAI.
          </li>
          <li>
            Kehilangan data akibat kejadian yang tidak dapat kami kendalikan.
          </li>
        </ul>
        <p>
          Tanggung jawab total kami kepada kamu tidak akan melebihi jumlah yang kamu bayarkan
          kepada kami dalam 30 hari terakhir sebelum klaim timbul.
        </p>
      </>
    ),
  },
  {
    id: 'perubahan-layanan',
    title: '9. Perubahan Layanan',
    content: (
      <>
        <p>
          Kami berhak untuk memodifikasi, menangguhkan, atau menghentikan layanan — baik sebagian
          maupun seluruhnya — kapan saja. Untuk perubahan signifikan, kami akan memberikan
          pemberitahuan minimal <strong className="text-gray-300">14 hari</strong> sebelumnya
          melalui email atau pemberitahuan di dashboard.
        </p>
        <p>
          Kami juga berhak memperbarui Syarat &amp; Ketentuan ini. Perubahan akan berlaku setelah
          diterbitkan di halaman ini. Penggunaan layanan yang berkelanjutan setelah perubahan
          diterbitkan dianggap sebagai penerimaan atas syarat yang diperbarui.
        </p>
        <p>
          Jika kamu tidak setuju dengan perubahan yang kami buat, kamu dapat menghentikan
          penggunaan layanan dan meminta penghapusan akun.
        </p>
      </>
    ),
  },
  {
    id: 'hukum',
    title: '10. Hukum yang Berlaku',
    content: (
      <>
        <p>
          Syarat &amp; Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan{' '}
          <strong className="text-gray-300">hukum Republik Indonesia</strong>, tanpa
          memperhatikan prinsip pertentangan hukum.
        </p>
        <p>
          Setiap sengketa yang timbul dari atau terkait dengan Syarat &amp; Ketentuan ini akan
          diselesaikan terlebih dahulu melalui musyawarah untuk mufakat. Jika penyelesaian
          musyawarah tidak tercapai dalam 30 hari, sengketa akan diselesaikan melalui pengadilan
          yang berwenang di Indonesia.
        </p>
      </>
    ),
  },
  {
    id: 'kontak',
    title: '11. Kontak',
    content: (
      <>
        <p>
          Jika kamu memiliki pertanyaan, keluhan, atau membutuhkan bantuan terkait Syarat &amp;
          Ketentuan ini atau layanan kami, silakan hubungi kami:
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
          <li>
            <strong className="text-gray-300">Waktu Respons</strong>: Kami berkomitmen merespons
            dalam 3 hari kerja.
          </li>
        </ul>
      </>
    ),
  },
]

export default function TermsOfServicePage() {
  return (
    <>
      <Head>
        <title>Syarat &amp; Ketentuan | Autofillstock</title>
        <meta
          name="description"
          content="Syarat & Ketentuan penggunaan layanan Autofillstock — hak, kewajiban, dan aturan penggunaan."
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
              <h1 className="text-3xl font-bold text-gray-100 mb-3">Syarat &amp; Ketentuan</h1>
              <p className="text-gray-500 text-sm">
                Tanggal Efektif: <span className="text-gray-400">7 Juli 2026</span>
              </p>
              <p className="text-gray-400 leading-relaxed mt-4">
                Selamat datang di Autofillstock. Harap baca Syarat &amp; Ketentuan ini dengan
                saksama sebelum menggunakan layanan kami. Dengan menggunakan layanan Autofillstock,
                kamu menyetujui untuk terikat oleh syarat-syarat yang tercantum di halaman ini.
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
                  transition={{ duration: 0.4, delay: 0.07 * i, ease: 'easeOut' }}
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
