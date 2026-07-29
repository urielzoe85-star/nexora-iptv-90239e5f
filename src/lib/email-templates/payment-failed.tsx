import React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { pickLocale, t } from './i18n'
import { EmailShell, s } from './_shell'

interface Props {
  client_name?: string
  order_ref?: string
  amount?: string
  currency?: string
  days_since_failure?: number
  pay_url?: string
  locale?: string
  unsubscribe_token?: string
}

const Email = (p: Props) => {
  const locale = pickLocale(p.locale)
  const days = Number(p.days_since_failure ?? 1) as 1 | 3 | 7
  const titleKey =
    days === 7 ? 'dunning.title.j7' : days === 3 ? 'dunning.title.j3' : 'dunning.title.j1'
  const payUrl = p.pay_url || 'https://nexora-iptv.com/checkout'
  return (
    <EmailShell preview={t('dunning.preview', locale)} locale={locale} unsubscribeToken={p.unsubscribe_token}>
      <Section style={s.card}>
        <Heading as="h2" style={s.h2}>{t(titleKey, locale)}</Heading>
        <Text style={s.text}>{t('renewal.hi', locale)} {p.client_name || 'client'},</Text>
        <Text style={s.text}>{t('dunning.body', locale)}</Text>
        <Section style={s.info}>
          <Text style={s.infoLine}><strong>{t('dunning.ref', locale)} :</strong> {p.order_ref || '—'}</Text>
          {p.amount ? (
            <Text style={s.infoLine}><strong>Montant :</strong> {p.amount} {p.currency || 'EUR'}</Text>
          ) : null}
        </Section>
        {days >= 3 ? <Text style={s.warn}>{t('dunning.suspend.warn', locale)}</Text> : null}
        <Section style={{ textAlign: 'center' as const, margin: '20px 0 8px' }}>
          <Button href={payUrl} style={s.button}>{t('dunning.cta', locale)}</Button>
        </Section>
      </Section>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => {
    const locale = pickLocale(d.locale)
    const days = Number(d.days_since_failure ?? 1) as 1 | 3 | 7
    const k = days === 7 ? 'dunning.title.j7' : days === 3 ? 'dunning.title.j3' : 'dunning.title.j1'
    return t(k, locale)
  },
  displayName: 'Relance de paiement',
  previewData: {
    client_name: 'Jean Dupont',
    order_ref: 'NXR-DEMO-001',
    amount: '19.90',
    currency: 'EUR',
    days_since_failure: 3,
    locale: 'fr',
  },
} satisfies TemplateEntry
