// app/page.tsx
'use client';

import { useState } from 'react';
import CircularLoader from '@/components/ui/Loader/CircularLoader';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import FeaturesSection from '@/components/home/FeaturesSection';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return (
      <CircularLoader 
        duration={4000}
        onComplete={() => setIsLoading(false)}
      />
    );
  }

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
      </main>
      <Footer />
    </>
  );
}