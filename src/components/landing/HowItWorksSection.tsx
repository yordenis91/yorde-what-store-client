import { useTranslation } from 'react-i18next'
import { ChevronDownIcon } from '@/components/ui/icons'
import { HOW_SECTION_ID, ROLES, type Role } from './roles'

interface Step {
  title: string
  body: string
}

interface Props {
  openRole: Role
  onOpenChange: (role: Role) => void
}

/** One role's flow is open at a time — progressive disclosure instead of 12 steps at once. */
export function HowItWorksSection({ openRole, onOpenChange }: Props) {
  const { t } = useTranslation()

  return (
    <section id={HOW_SECTION_ID} className="scroll-mt-16 bg-gray-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">{t('landing.how.title')}</h2>
        <p className="mt-2 text-center text-gray-600">{t('landing.how.subtitle')}</p>

        <div className="mt-8 flex flex-col gap-3">
          {ROLES.map((role) => {
            const isOpen = role === openRole
            const steps = t(`landing.how.steps.${role}`, { returnObjects: true }) as Step[]
            return (
              <div key={role} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`how-${role}`}
                  onClick={() => onOpenChange(role)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-gray-900">{t(`landing.audience.roles.${role}.label`)}</span>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <ol id={`how-${role}`} className="flex flex-col gap-4 border-t border-gray-100 px-5 py-5">
                    {steps.map((step, i) => (
                      <li key={step.title} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{step.title}</p>
                          <p className="mt-0.5 text-sm text-gray-600">{step.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
