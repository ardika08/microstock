import type { NextPage } from 'next';
import Head from 'next/head';
import { Navbar } from '~/components/landing/Navbar';
import { Hero } from '~/components/landing/Hero';
import { PlatformLogos } from '~/components/landing/PlatformLogos';
import { HowItWorks } from '~/components/landing/HowItWorks';
import { Comparison } from '~/components/landing/Comparison';
import { Pricing } from '~/components/landing/Pricing';
import { FAQ } from '~/components/landing/FAQ';
import { Footer } from '~/components/landing/Footer';
import { FloatingCTA } from '~/components/landing/FloatingCTA';
import { PreLaunchModal } from '~/components/landing/PreLaunchModal';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Autofillstock - Otomasi Metadata Microstock dengan AI</title>
        <meta
          name="description"
          content="Hemat waktu hingga 95% dengan AI yang menghasilkan judul, deskripsi, dan keyword berkualitas tinggi untuk gambar microstock Anda secara otomatis."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-slate-950 text-gray-100">
        <PreLaunchModal />
        <Navbar />
        <main>
          <Hero />
          <PlatformLogos />
          <HowItWorks />
          <Comparison />
          <Pricing />
          <FAQ />
        </main>
        <Footer />
        <FloatingCTA />
      </div>
    </>
  );
};

export default Home;
