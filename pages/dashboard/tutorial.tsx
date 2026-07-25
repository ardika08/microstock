import DashboardLayout from '~/components/dashboard/DashboardLayout'
import { PlayCircle } from 'lucide-react'

interface Tutorial {
  id: string
  title: string
  description: string
  youtubeId: string | null
}

const tutorials: Tutorial[] = [
  {
    id: '1',
    title: 'Cara Install & Aktivasi Extension',
    description: 'Panduan lengkap install extension Autofillstock di Chrome, aktivasi kode, dan setup awal sebelum mulai generate metadata.',
    youtubeId: null,
  },
  {
    id: '2',
    title: 'Cara Generate Metadata di Adobe Stock',
    description: 'Tutorial step-by-step cara generate metadata otomatis untuk upload di Adobe Stock menggunakan extension Autofillstock.',
    youtubeId: 'QE98Fb0f6KY',
  },
  {
    id: '3',
    title: 'Cara Generate Metadata Menggunakan Extension',
    description: 'Panduan lengkap cara menggunakan extension Autofillstock langsung dari halaman upload untuk generate metadata secara otomatis.',
    youtubeId: 'zfh7uUVoiNk',
  },
]

function VideoCard({ tutorial }: { tutorial: Tutorial }) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-200">
      {/* Video embed / placeholder */}
      <div className="relative w-full aspect-video bg-slate-800">
        {tutorial.youtubeId ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${tutorial.youtubeId}`}
            title={tutorial.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <PlayCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <span className="text-sm text-slate-500">Video segera diupload</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[11px] font-bold text-emerald-400">
            {tutorial.id}
          </span>
          <div>
            <h3 className="text-gray-100 font-semibold text-sm leading-snug">
              {tutorial.title}
            </h3>
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
              {tutorial.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TutorialPage() {
  return (
    <DashboardLayout title="Tutorial">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Tutorial</h1>
          <p className="text-gray-400 text-sm mt-1">
            Panduan video untuk memaksimalkan penggunaan Autofillstock
          </p>
        </div>

        {/* Video Grid — 3 kolom di desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutorials.map(tutorial => (
            <VideoCard key={tutorial.id} tutorial={tutorial} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
