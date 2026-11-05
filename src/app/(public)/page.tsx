import { Suspense } from "react";
import {
  AboutSection,
  ActivitySection,
  CtaSection,
  DocumentationSection,
  Hero,
  HeroLevelChip,
  InventorySection,
  SectionSkeleton,
  StatsSection,
  TransparencySection,
  UpcomingSection,
} from "@/components/landing/sections";
import { ORG_LOCATION_FULL, ORG_NAME, SITE_URL } from "@/lib/config";

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    alternateName: "BASECAMP PEMUDA RW 05",
    url: SITE_URL,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Kwarasan",
      addressLocality: "Nogotirto, Gamping",
      addressRegion: "Sleman, Daerah Istimewa Yogyakarta",
      addressCountry: "ID",
    },
    description: `Organisasi pemuda di ${ORG_LOCATION_FULL}.`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero
        levelChip={
          <Suspense fallback={null}>
            <HeroLevelChip />
          </Suspense>
        }
      />
      <Suspense fallback={<SectionSkeleton />}>
        <AboutSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <StatsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton tall />}>
        <UpcomingSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton tall />}>
        <TransparencySection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <InventorySection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton tall />}>
        <DocumentationSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton tall />}>
        <ActivitySection />
      </Suspense>
      <CtaSection />
    </>
  );
}
