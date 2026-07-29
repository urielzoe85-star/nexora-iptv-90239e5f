import React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { pickLocale, t } from './i18n'
import { EmailShell, s } from './_shell'

interface Props {
  client_name?: string
  username?: string
  expires_at?: string
  days_left?: number
  renew_url?: string
  locale?: string
  unsubscribe_token?: string
}

const Email = (p: Props) => {
  const locale = pickLocale(p.locale)
  const days = Number(p.days_left ?? 7) as 7 | 3 | 1
  const titleKey =
    days === 1 ? 'renewal.title.j1' : days === 3 ? 'renewal.title.j3' : 'renewal.title.j7'
  const renewUrl = p.renew_url || 'https://nexora-iptv.com/dashboard'
  const expiresLabel = p.expires_at
    ? new Date(p.expires_at).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR')
    : '—'
  return (
    <EmailShell preview={t('renewal.preview', locale)} locale={locale} unsubscribeToken={p.unsubscribe_token}>
      <Section style={s.card}>
        <Heading as="h2" style={s.h2}>{t(titleKey, locale)}</Heading>
        <Text style={s.text}>{t('renewal.hi', locale)} {p.client_name || 'client'},</Text>
        <Text style={s.text}>{t('renewal.body', locale)}</Text>
        <Section style={s.info}>
          <Text style={s.infoLine}><strong>{t('renewal.username', locale)} :</strong> {p.username ?? '—'}</Text>
          <Text style={s.infoLine}><strong>{t('renewal.expires', locale)} :</strong> {expiresLabel}</Text>
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '20px 0 8px' }}>
          <Button href={renewUrl} style={s.button}>{t('renewal.cta', locale)}</Button>
        </Section>
      </Section>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => {
    const locale = pickLocale(d.locale)
    const days = Number(d.days_left ?? 7) as 7 | 3 | 1
    const k = days === 1 ? 'renewal.title.j1' : days === 3 ? 'renewal.title.j3' : 'renewal.title.j7'
    return t(k, locale)
  },
  displayName: 'Rappel de renouvellement IPTV',
  previewData: {
    client_name: 'Jean Dupont',
    username: 'demo_user',
    expires_at: new Date(Date.now() + 3 * 86400_000).toISOString(),
    days_left: 3,
    locale: 'fr',
  },
} satisfies TemplateEntry
