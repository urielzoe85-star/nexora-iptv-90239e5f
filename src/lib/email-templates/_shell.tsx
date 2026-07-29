import React from 'react'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import { pickLocale, t, type Locale } from './i18n'
import { buildWhatsAppLink } from '../whatsapp-contact'

export const SITE_URL = 'https://nexora-iptv.com'
export const PORTAL_URL = 'https://account.nexora-iptv.com'
export const SUPPORT_EMAIL = 'support@nexora-iptv.com'
export const TELEGRAM_URL = 'https://t.me/NexoraIPTVBot'

export const NAVY = '#0B1220'
export const GOLD = '#D4AF37'

export interface EmailShellProps {
  preview: string
  locale?: string
  unsubscribeToken?: string | null
  children: React.ReactNode
}

export const EmailShell = ({ preview, locale, unsubscribeToken, children }: EmailShellProps) => {
  const lang: Locale = pickLocale(locale)
  const year = new Date().getFullYear()
  const unsubUrl = unsubscribeToken
    ? `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
    : `${SITE_URL}/unsubscribe`
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* En-tête de marque */}
          <Section style={header}>
            <Heading style={brand}>NEXORA IPTV</Heading>
            <Text style={tagline}>{t('shell.tagline', lang)}</Text>
          </Section>
          <Section style={goldBar} />

          {/* Contenu */}
          <Section style={content}>{children}</Section>

          {/* Signature */}
          <Section style={footerWrap}>
            <Hr style={hr} />
            <Text style={signName}>{t('shell.sign.team', lang)}</Text>
            <Text style={signRole}>{t('shell.sign.role', lang)}</Text>
            <Text style={footerLine}>
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>
              {'  ·  '}
              <Link href={SITE_URL} style={link}>nexora-iptv.com</Link>
              {'  ·  '}
              <Link href={PORTAL_URL} style={link}>{t('shell.portal', lang)}</Link>
            </Text>
            <Text style={footerLine}>
              <Link href={buildWhatsAppLink()} style={chipWa}>WhatsApp</Link>
              {' '}
              <Link href={TELEGRAM_URL} style={chipTg}>Telegram</Link>
              {' '}
              <Link href={SITE_URL} style={chipSite}>{t('shell.website', lang)}</Link>
            </Text>
            <Hr style={hr} />
            <Text style={legal}>© {year} Nexora IPTV. {t('shell.legal', lang)}</Text>
            <Text style={legal}>
              {t('shell.unsub.intro', lang)}{' '}
              <Link href={unsubUrl} style={unsubLink}>{t('shell.unsub.link', lang)}</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/* Styles partagés réutilisables par les modèles clients */
export const s = {
  h2: { fontSize: 20, color: NAVY, margin: '0 0 12px' } as const,
  h3: { fontSize: 15, color: NAVY, margin: '16px 0 8px' } as const,
  text: { fontSize: 14, lineHeight: '22px', color: '#334155', margin: '0 0 12px' } as const,
  card: { backgroundColor: '#f8fafc', borderRadius: 12, padding: '20px 20px 12px', border: '1px solid #e8ecf2' } as const,
  info: { backgroundColor: '#ffffff', borderRadius: 8, padding: '12px 16px', margin: '12px 0', border: '1px solid #e2e8f0' } as const,
  infoLine: { fontSize: 14, color: NAVY, margin: '4px 0' } as const,
  pre: { backgroundColor: NAVY, borderRadius: 8, padding: '12px 16px', margin: '12px 0' } as const,
  preText: { fontFamily: 'Menlo, Consolas, monospace', fontSize: 13, color: '#e2e8f0', whiteSpace: 'pre-wrap' as const, margin: 0 } as const,
  button: { backgroundColor: GOLD, color: NAVY, padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'inline-block', margin: '4px 8px 4px 0' } as const,
  buttonDark: { backgroundColor: NAVY, color: '#ffffff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'inline-block', margin: '4px 8px 4px 0' } as const,
  buttonWa: { backgroundColor: '#25D366', color: '#ffffff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'inline-block', margin: '4px 8px 4px 0' } as const,
  hr: { borderColor: '#e2e8f0', margin: '20px 0' } as const,
  warn: { fontSize: 14, color: '#b91c1c', margin: '12px 0', fontWeight: 600 } as const,
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: 600, margin: '0 auto', padding: '24px 16px' }
const header = { backgroundColor: NAVY, borderRadius: '12px 12px 0 0', padding: '24px 24px 18px', textAlign: 'center' as const }
const brand = { color: GOLD, fontSize: 26, letterSpacing: '0.14em', margin: 0, fontWeight: 700 }
const tagline = { color: '#c7d2e0', fontSize: 12, letterSpacing: '0.06em', margin: '6px 0 0' }
const goldBar = { height: 4, backgroundColor: GOLD, borderRadius: '0 0 3px 3px', margin: '0 0 20px' }
const content = { padding: '0 4px' }
const footerWrap = { padding: '4px 4px 0', textAlign: 'center' as const }
const hr = { borderColor: '#e6e9ef', margin: '18px 0' }
const signName = { fontSize: 14, color: NAVY, fontWeight: 700, margin: '0 0 2px' }
const signRole = { fontSize: 12, color: '#64748b', margin: '0 0 10px' }
const footerLine = { fontSize: 12, color: '#64748b', margin: '0 0 8px' }
const link = { color: NAVY, textDecoration: 'none' }
const chipBase = { display: 'inline-block', padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: 'none', margin: '0 3px' }
const chipWa = { ...chipBase, backgroundColor: '#25D366', color: '#ffffff' }
const chipTg = { ...chipBase, backgroundColor: '#229ED9', color: '#ffffff' }
const chipSite = { ...chipBase, backgroundColor: NAVY, color: GOLD }
const legal = { fontSize: 11, color: '#94a3b8', margin: '0 0 4px', lineHeight: '17px' }
const unsubLink = { color: '#64748b', textDecoration: 'underline' }
