import { BenefitsSection } from '../components/home/BenefitsSection';
import { EstimateSection } from '../components/home/EstimateSection';
import { FaqSection } from '../components/home/FaqSection';
import { FocusTicketSection } from '../components/home/FocusTicketSection';
import { HeroSection } from '../components/home/HeroSection';
import { IdeSection } from '../components/home/IdeSection';
import { ShowcaseSection } from '../components/home/ShowcaseSection';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <EstimateSection />
      <BenefitsSection />
      <IdeSection />
      <ShowcaseSection />
      <FocusTicketSection />
      <FaqSection />
    </>
  );
}
