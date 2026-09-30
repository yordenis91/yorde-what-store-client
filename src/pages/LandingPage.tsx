import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { HeroSection } from '@/components/landing/HeroSection'
import { AudienceSection } from '@/components/landing/AudienceSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { SocialProofSection } from '@/components/landing/SocialProofSection'
import { FaqSection } from '@/components/landing/FaqSection'
import { FinalCtaSection } from '@/components/landing/FinalCtaSection'
import type { Role } from '@/components/landing/roles'

export function LandingPage() {
  const { t } = useTranslation()
  const [openRole, setOpenRole] = useState<Role>('admin')

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <HeroSection />
        <AudienceSection onSelect={setOpenRole} />
        <HowItWorksSection openRole={openRole} onOpenChange={setOpenRole} />
        <SocialProofSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <footer className="flex flex-col items-center gap-2 border-t border-gray-200 bg-white px-4 py-6 text-xs text-gray-500">
        <div className="flex gap-4">
          <Link to="/terms" className="hover:text-gray-700">
            {t('footer.terms')}
          </Link>
          <Link to="/privacy" className="hover:text-gray-700">
            {t('footer.privacy')}
          </Link>
        </div>
        <p>
          © {new Date().getFullYear()} {t('app.name')} — {t('footer.rights')}
        </p>
      </footer>
    </div>
  )
}
