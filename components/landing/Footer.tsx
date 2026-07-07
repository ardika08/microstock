import React from 'react';
import { Zap, Twitter, Instagram, Youtube, Mail, MessageCircle } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const sitemap = [
    {
      heading: 'Produk',
      links: [
        { label: 'Fitur', href: '#fitur' },
        { label: 'Harga', href: '#harga' },
        { label: 'Cara Kerja', href: '#cara-kerja' },
        { label: 'Changelog', href: '#' },
      ],
    },
    {
      heading: 'Dukungan',
      links: [
        { label: 'Dokumentasi', href: '#' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Hubungi Kami', href: 'mailto:support@autofillstock.com' },
        { label: 'Status Sistem', href: '#' },
      ],
    },
    {
      heading: 'Perusahaan',
      links: [
        { label: 'Tentang Kami', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Karir', href: '#' },
        { label: 'Afiliasi', href: '#' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Kebijakan Privasi', href: '#' },
        { label: 'Syarat & Ketentuan', href: '#' },
        { label: 'Kebijakan Refund', href: '#' },
        { label: 'Cookie Policy', href: '#' },
      ],
    },
  ];

  const socials = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Youtube, href: '#', label: 'YouTube' },
    { icon: MessageCircle, href: '#', label: 'Telegram' },
    { icon: Mail, href: 'mailto:support@autofillstock.com', label: 'Email' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top section */}
        <div className="py-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Autofillstock</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Otomasi metadata microstock dengan kecerdasan buatan. Hemat waktu, tingkatkan kualitas.
            </p>
            <div className="flex items-center gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Sitemap columns */}
          {sitemap.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {currentYear} Autofillstock. Hak cipta dilindungi undang-undang.
          </p>
          <p className="text-sm text-gray-500">
            Dibuat dengan ❤️ untuk para contributor microstock Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
