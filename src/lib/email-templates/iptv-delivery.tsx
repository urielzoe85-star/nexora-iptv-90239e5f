import React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { buildWhatsAppLink } from '../whatsapp-contact'

interface DeliveryProps {
  iptv_account_id?: string
  username?: string
  password?: string | null
  package?: string | null
  account_type?: string | null
  provider?: string | null
  duration_months?: number | null
  expires_at?: string | null
  max_connections?: number | null
  dns_link?: string | null
  dns_link_samsung_lg?: string | null
  portal_link?: string | null
  m3u_url?: string | null
  enigma_url?: string | null
  playlist_download_url?: string | null
  enigma_download_url?: string | null
}

interface Props {
  client_name?: string
  product_name?: string
  order_ref?: string
  delivery?: DeliveryProps
  // Legacy props (pre-1.6) — still supported for admin composer.
  username?: string
  password?: string
  dns?: string
  dns_samsung_lg?: string
  portal_link?: string
  expiration_date?: string
  max_connections?: string
  message?: string // overrides default body with the admin-edited content (kept as preformatted text)
}

const Email = (p: Props) => {
  const name = (p.client_name || 'client').toString()
  const product = p.product_name || 'Abonnement IPTV'
  const useCustomMessage = !!(p.message && p.message.trim().length > 0)
  const d = p.delivery
  const fmtDate = (iso?: string | null) => {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleDateString() } catch { return '—' }
  }
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Vos accès {product} sont prêts</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brand}>Nexora IPTV</Heading>
          <Section style={card}>
            <Heading as="h2" style={h2}>Vos accès sont prêts 🎬</Heading>
            <Text style={text}>Bonjour {name}, votre <strong>{product}</strong> est activé.</Text>

            {useCustomMessage ? (
              <Text style={messageText}>{p.message}</Text>
            ) : d ? (
              <>
                <Section style={pre}>
                  <Text style={preText}>
{`👤 Username : ${d.username ?? '—'}
🔑 Password : ${d.password ?? '—'}
${d.dns_link ? `🔗 DNS : ${d.dns_link}\n` : ''}${d.dns_link_samsung_lg ? `📺 Samsung/LG : ${d.dns_link_samsung_lg}\n` : ''}${d.m3u_url ? `📥 M3U : ${d.m3u_url}\n` : ''}${d.enigma_url ? `📡 Enigma : ${d.enigma_url}\n` : ''}${d.portal_link ? `🌐 Portail : ${d.portal_link}\n` : ''}${d.package ? `📦 Package : ${d.package}\n` : ''}${d.max_connections ? `👥 Connexions : ${d.max_connections}\n` : ''}⏳ Expiration : ${fmtDate(d.expires_at)}`}
                  </Text>
                </Section>
                {d.playlist_download_url && (
                  <Button href={d.playlist_download_url} style={cta}>Télécharger la playlist M3U</Button>
                )}
                {d.enigma_download_url && (
                  <Button href={d.enigma_download_url} style={ctaAlt}>Télécharger Enigma</Button>
                )}
                <Hr style={hr} />
                <Heading as="h3" style={h3}>Instructions rapides</Heading>
                <Text style={text}>
                  1. Ouvrez votre application IPTV (IPTV Smarters, TiviMate, GSE Smart IPTV…).<br />
                  2. Collez le lien M3U <em>ou</em> saisissez Username / Password / DNS.<br />
                  3. Vos chaînes se chargent automatiquement.
                </Text>
                <Text style={text}>
                  Référence commande : <strong>{p.order_ref || '—'}</strong>
                </Text>
                <Hr style={hr} />
                <Text style={text}>Besoin d'aide ? Écrivez-nous sur WhatsApp :</Text>
                <Button href={buildWhatsAppLink({ orderRef: p.order_ref ?? null })} style={ctaWa}>
                  💬 Contacter le support WhatsApp
                </Button>
              </>
            ) : (
              <>
                <Text style={text}>Bonjour {name},</Text>
                <Text style={text}>
                  Votre abonnement <strong>{product}</strong> est activé. Voici vos
                  identifiants&nbsp;:
                </Text>
                <Section style={pre}>
                  <Text style={preText}>
                    {`Username : ${p.username ?? '—'}\nPassword : ${p.password ?? '—'}\nDNS : ${p.dns ?? '—'}\nPortail : ${p.portal_link ?? '—'}\nConnexions max : ${p.max_connections ?? '—'}\nExpiration : ${p.expiration_date ?? '—'}`}
                  </Text>
                </Section>
                <Text style={text}>
                  Référence commande&nbsp;: <strong>{p.order_ref || '—'}</strong>
                </Text>
                <Button href={buildWhatsAppLink({ orderRef: p.order_ref ?? null })} style={ctaWa}>
                  💬 Contacter le support WhatsApp
                </Button>
              </>
            )}
            <Hr style={hr} />
            <Text style={footer}>— L'équipe Nexora IPTV</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Vos accès ${d.product_name ?? 'IPTV'} — Nexora IPTV`,
  displayName: 'Livraison IPTV',
  previewData: {
    client_name: 'Jean Dupont',
    product_name: 'Premium 12 mois',
    order_ref: 'NXR-DEMO-001',
    delivery: {
      username: 'demo_user',
      password: 'demo_pass',
      dns_link: 'http://dns.example.com:80',
      dns_link_samsung_lg: 'http://dns.example.com/samsung',
      m3u_url: 'http://dns.example.com/get.php?username=demo_user&password=demo_pass&type=m3u_plus',
      enigma_url: 'http://dns.example.com/enigma2.php?username=demo_user&password=demo_pass',
      package: 'Premium 12 mois',
      max_connections: 2,
      expires_at: '2026-12-31T00:00:00Z',
      playlist_download_url: 'https://nexora-iptv.com/api/public/iptv/playlist?t=demo&k=m3u',
    },
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: 560, margin: '0 auto', padding: '24px 16px' }
const brand = { color: '#3B82F6', fontSize: 22, margin: '0 0 16px', textAlign: 'center' as const }
const card = { backgroundColor: '#f8fafc', borderRadius: 12, padding: '24px 24px 16px' }
const h2 = { fontSize: 20, color: '#0f172a', margin: '0 0 12px' }
const h3 = { fontSize: 15, color: '#0f172a', margin: '16px 0 8px' }
const text = { fontSize: 14, lineHeight: '22px', color: '#334155', margin: '0 0 12px' }
const pre = { backgroundColor: '#0f172a', borderRadius: 8, padding: '12px 16px', margin: '12px 0' }
const preText = { fontFamily: 'Menlo, Consolas, monospace', fontSize: 13, color: '#e2e8f0', whiteSpace: 'pre-wrap' as const, margin: 0 }
const messageText = { fontSize: 14, lineHeight: '22px', color: '#0f172a', whiteSpace: 'pre-wrap' as const, margin: '0 0 12px' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: 12, color: '#64748b', textAlign: 'center' as const, margin: 0 }
const cta = { backgroundColor: '#3B82F6', color: '#ffffff', borderRadius: 8, padding: '12px 20px', display: 'inline-block', textDecoration: 'none', fontSize: 14, fontWeight: 600, margin: '4px 8px 4px 0' }
const ctaAlt = { ...cta, backgroundColor: '#0f172a' }
const ctaWa = { ...cta, backgroundColor: '#25D366' }