'use client'

import { setLocale, getLocale, locales } from '@/paraglide/runtime'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
  const currentLocale = getLocale()

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale !== currentLocale) {
      setLocale(newLocale as typeof locales[number], { reload: true })
    }
  }

  return (
    <div className="flex items-center gap-2">
      {locales.map((locale) => (
        <Button
          key={locale}
          variant={currentLocale === locale ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleLanguageChange(locale)}
          className="min-w-[60px]"
        >
          {locale === 'ja' ? '日本語' : locale === 'en' ? 'English' : locale}
        </Button>
      ))}
    </div>
  )
}
