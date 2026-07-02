import React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { pickLocale, t } from './i18n'

interface Props {
  client_name?: string
  order_ref?: string
  amount?: string
  currency?: string
  days_since_failure?: number
  pay_url?: string
  locale?: string
}

const Email = (p: Props) => {
  const locale = pickLocale(p.locale)
  const days = Number(p.days_since_failure ?? 1) as 1 | 3 | 7
  const titleKey =
    days === 7 ? 'dunning.title.j7' : days === 3 ? 'dunning.title.j3' : 'dunning.title.j1'
  const payUrl = p.pay_url || 'https://nexora-iptv.com/checkout'
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{t('dunning.preview', locale)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brand}>Nexora IPTV</Heading>
          <Section style={card}>
            <Heading as="h2" style={h2}>{t(titleKey, locale)}</Heading>
            <Text style={text}>{t('renewal.hi', locale)} {p.client_name || 'client'},</Text>
            <Text style={text}>{t('dunning.body', locale)}</Text>
            <Section style={info}>
              <Text style={infoLine}><strong>{t('dunning.ref', locale)} :</strong> {p.order_ref || '—'}</Text>
              {p.amount ? (
                <Text style={infoLine}><strong>Montant :</strong> {p.amount} {p.currency || 'EUR'}</Text>
              ) : null}
            </Section>
            {days >= 3 ? (
              <Text style={warn}>{t('dunning.suspend.warn', locale)}</Text>
            ) : null}
            <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
              <Button href={payUrl} style={button}>{t('dunning.cta', locale)}</Button>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>{t('renewal.footer', locale)}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
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

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: 560, margin: '0 auto', padding: '24px 16px' }
const brand = { color: '#3B82F6', fontSize: 22, margin: '0 0 16px', textAlign: 'center' as const }
const card = { backgroundColor: '#f8fafc', borderRadius: 12, padding: '24px 24px 16px' }
const h2 = { fontSize: 20, color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: 14, lineHeight: '22px', color: '#334155', margin: '0 0 12px' }
const info = { backgroundColor: '#ffffff', borderRadius: 8, padding: '12px 16px', margin: '12px 0', border: '1px solid #e2e8f0' }
const infoLine = { fontSize: 14, color: '#0f172a', margin: '4px 0' }
const warn = { fontSize: 14, color: '#b91c1c', margin: '12px 0', fontWeight: 600 }
const button = { backgroundColor: '#3B82F6', color: '#ffffff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: 12, color: '#64748b', textAlign: 'center' as const, margin: 0 }