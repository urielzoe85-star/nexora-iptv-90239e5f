import React from 'react'
import { Button, Heading, Hr, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { buildWhatsAppLink } from '../whatsapp-contact'
import { EmailShell, s } from './_shell'

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
  unsubscribe_token?: string
  // Legacy props (pre-1.6) — still supported for admin composer.
  username?: string
  password?: string
  dns?: string
  dns_samsung_lg?: string
  portal_link?: string
  expiration_date?: string
  max_connections?: string
  message?: string
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
    <EmailShell
      preview={`Vos accès ${product} sont prêts`}
      locale="fr"
      unsubscribeToken={p.unsubscribe_token}
    >
      <Section style={s.card}>
        <Heading as="h2" style={s.h2}>Vos accès sont prêts 🎬</Heading>
        <Text style={s.text}>Bonjour {name}, votre <strong>{product}</strong> est activé.</Text>

        {useCustomMessage ? (
          <Text style={messageText}>{p.message}</Text>
        ) : d ? (
          <>
            <Section style={s.pre}>
              <Text style={s.preText}>
{`👤 Username : ${d.username ?? '—'}
🔑 Password : ${d.password ?? '—'}
${d.dns_link ? `🔗 DNS : ${d.dns_link}\n` : ''}${d.dns_link_samsung_lg ? `📺 Samsung/LG : ${d.dns_link_samsung_lg}\n` : ''}${d.m3u_url ? `📥 M3U : ${d.m3u_url}\n` : ''}${d.enigma_url ? `📡 Enigma : ${d.enigma_url}\n` : ''}${d.portal_link ? `🌐 Portail : ${d.portal_link}\n` : ''}${d.package ? `📦 Package : ${d.package}\n` : ''}${d.max_connections ? `👥 Connexions : ${d.max_connections}\n` : ''}⏳ Expiration : ${fmtDate(d.expires_at)}`}
              </Text>
            </Section>
            {d.playlist_download_url && (
              <Button href={d.playlist_download_url} style={s.button}>Télécharger la playlist M3U</Button>
            )}
            {d.enigma_download_url && (
              <Button href={d.enigma_download_url} style={s.buttonDark}>Télécharger Enigma</Button>
            )}
            <Hr style={s.hr} />
            <Heading as="h3" style={s.h3}>Instructions rapides</Heading>
            <Text style={s.text}>
              1. Ouvrez votre application IPTV (IPTV Smarters, TiviMate, GSE Smart IPTV…).<br />
              2. Collez le lien M3U <em>ou</em> saisissez Username / Password / DNS.<br />
              3. Vos chaînes se chargent automatiquement.
            </Text>
            <Text style={s.text}>
              Référence commande : <strong>{p.order_ref || '—'}</strong>
            </Text>
            <Hr style={s.hr} />
            <Text style={s.text}>Besoin d'aide ? Écrivez-nous sur WhatsApp :</Text>
            <Button href={buildWhatsAppLink({ orderRef: p.order_ref ?? null })} style={s.buttonWa}>
              💬 Contacter le support WhatsApp
            </Button>
          </>
        ) : (
          <>
            <Text style={s.text}>Bonjour {name},</Text>
            <Text style={s.text}>
              Votre abonnement <strong>{product}</strong> est activé. Voici vos identifiants&nbsp;:
            </Text>
            <Section style={s.pre}>
              <Text style={s.preText}>
                {`Username : ${p.username ?? '—'}\nPassword : ${p.password ?? '—'}\nDNS : ${p.dns ?? '—'}\nPortail : ${p.portal_link ?? '—'}\nConnexions max : ${p.max_connections ?? '—'}\nExpiration : ${p.expiration_date ?? '—'}`}
              </Text>
            </Section>
            <Text style={s.text}>
              Référence commande&nbsp;: <strong>{p.order_ref || '—'}</strong>
            </Text>
            <Button href={buildWhatsAppLink({ orderRef: p.order_ref ?? null })} style={s.buttonWa}>
              💬 Contacter le support WhatsApp
            </Button>
          </>
        )}
      </Section>
    </EmailShell>
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

const messageText = { fontSize: 14, lineHeight: '22px', color: '#0B1220', whiteSpace: 'pre-wrap' as const, margin: '0 0 12px' }
