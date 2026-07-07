import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '~/components/ui/badge';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Bagaimana cara kerja Autofillstock?',
    answer:
      'Autofillstock adalah Chrome Extension yang terintegrasi langsung dengan platform microstock. Setelah Anda menginstal extension dan mengunggah gambar, AI kami menganalisis konten visual gambar menggunakan teknologi Computer Vision dan Natural Language Processing. Dalam hitungan detik, sistem menghasilkan judul yang deskriptif, deskripsi detail, dan hingga 50 keyword SEO-optimized yang relevan. Metadata tersebut kemudian dapat langsung di-export ke platform pilihan Anda.',
  },
  {
    question: 'Apakah data dan gambar saya aman?',
    answer:
      'Keamanan data Anda adalah prioritas utama kami. Gambar yang Anda unggah hanya diproses sementara untuk analisis AI dan tidak disimpan di server kami setelah proses selesai. Semua transmisi data menggunakan enkripsi TLS/HTTPS. Kami tidak pernah menjual atau membagikan data pengguna kepada pihak ketiga. Autofillstock mematuhi regulasi GDPR dan kebijakan privasi yang ketat.',
  },
  {
    question: 'Apakah ada kebijakan refund?',
    answer:
      'Untuk paket berlangganan bulanan (Starter), kami menawarkan garansi uang kembali 7 hari jika Anda tidak puas dengan layanan kami. Untuk pembelian kredit (Pay as You Go dan One-time), kredit yang belum digunakan dapat dikembalikan dalam 14 hari setelah pembelian. Pengajuan refund dilakukan melalui email support@autofillstock.com dengan menyertakan bukti pembayaran.',
  },
  {
    question: 'Apa perbedaan antara paket Free Trial, Pay as You Go, dan Starter?',
    answer:
      'Free Trial memberikan 20 kredit gratis tanpa perlu kartu kredit — cocok untuk mencoba semua fitur. Pay as You Go (Rp50.000/500 kredit) adalah pembelian kredit satu kali yang tidak pernah expire, ideal untuk contributor dengan volume upload tidak menentu. Starter (Rp99.000/bulan) memberikan 1.000 kredit setiap bulan dengan fitur batch processing hingga 50 gambar sekaligus, priority support, dan analisis performa — cocok untuk contributor aktif yang ingin efisiensi maksimal.',
  },
  {
    question: 'Bagaimana cara top-up kredit?',
    answer:
      'Top-up kredit dapat dilakukan kapan saja melalui dashboard akun Anda. Kami menerima berbagai metode pembayaran termasuk transfer bank (BCA, Mandiri, BNI, BRI), kartu kredit/debit (Visa/Mastercard), dan e-wallet (GoPay, OVO, Dana, ShopeePay). Kredit akan ditambahkan secara otomatis ke akun Anda dalam waktu maksimal 5 menit setelah pembayaran dikonfirmasi.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">FAQ</Badge>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Belum menemukan jawaban? Hubungi kami di{' '}
            <a href="mailto:support@autofillstock.com" className="text-blue-600 hover:underline">
              support@autofillstock.com
            </a>
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-blue-600 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5">
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
