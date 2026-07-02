import React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { pickLocale, t } from './i18n'

interface Props {
  client_name?: string
  username?: string
  expires_at?: string
  days_left?: number
  renew_url?: string
  locale?: string
}

const Email = (p: Props) => {
  const locale = pickLocale(p.locale)
  const days = Number(p.days_left ?? 7) as 7 | 3 | 1
  const titleKey =
    days === 1 ? 'renewal.title.j1' : days === 3 ? 'renewal.title.j3' : 'renewal.title.j7'
  const renewUrl = p.renew_url || 'https://nexora-iptv.com/dashboard'
  const expiresLabel = p.expires_at ? new Date(p.expires_at).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR') : '—'
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{t('renewal.preview', locale)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brand}>Nexora IPTV</Heading>
          <Section style={card}>
            <Heading as="h2" style={h2}>{t(titleKey, locale)}</Heading>
            <Text style={text}>{t('renewal.hi', locale)} {p.client_name || 'client'},</Text>
            <Text style={text}>{t('renewal.body', locale)}</Text>
            <Section style={info}>
              <Text style={infoLine}><strong>{t('renewal.username', locale)} :</strong> {p.username ?? '—'}</Text>
              <Text style={infoLine}><strong>{t('renewal.expires', locale)} :</strong> {expiresLabel}</Text>
            </Section>
            <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
              <Button href={renewUrl} style={button}>{t('renewal.cta', locale)}</Button>
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

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: 560, margin: '0 auto', padding: '24px 16px' }
const brand = { color: '#3B82F6', fontSize: 22, margin: '0 0 16px', textAlign: 'center' as const }
const card = { backgroundColor: '#f8fafc', borderRadius: 12, padding: '24px 24px 16px' }
const h2 = { fontSize: 20, color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: 14, lineHeight: '22px', color: '#334155', margin: '0 0 12px' }
const info = { backgroundColor: '#ffffff', borderRadius: 8, padding: '12px 16px', margin: '12px 0', border: '1px solid #e2e8f0' }
const infoLine = { fontSize: 14, color: '#0f172a', margin: '4px 0' }
const button = { backgroundColor: '#3B82F6', color: '#ffffff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: 12, color: '#64748b', textAlign: 'center' as const, margin: 0 }