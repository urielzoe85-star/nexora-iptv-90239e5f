import React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  client_name?: string
  product_name?: string
  username?: string
  password?: string
  dns?: string
  dns_samsung_lg?: string
  portal_link?: string
  expiration_date?: string
  max_connections?: string
  order_ref?: string
  message?: string // overrides default body with the admin-edited content (kept as preformatted text)
}

const Email = (p: Props) => {
  const name = (p.client_name || 'client').toString()
  const product = p.product_name || 'Abonnement IPTV'
  // Quand l'admin a saisi un corps personnalisé dans le DeliveryComposer,
  // on le rend tel quel (texte préformaté), sans ajouter notre propre
  // salutation / bloc credentials — sinon on dupliquait le « Bonjour … »
  // et on collait le message complet dans un bloc monospace au milieu
  // d'une mise en page HTML.
  const useCustomMessage = !!(p.message && p.message.trim().length > 0)
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Vos accès {product} sont prêts</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brand}>Nexora IPTV</Heading>
          <Section style={card}>
            <Heading as="h2" style={h2}>Vos accès sont prêts 🎬</Heading>
            {useCustomMessage ? (
              <Text style={messageText}>{p.message}</Text>
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
    username: 'demo_user',
    password: 'demo_pass',
    dns: 'http://dns.example.com:80',
    portal_link: 'http://portal.example.com',
    expiration_date: '31/12/2026',
    max_connections: '2',
    order_ref: 'NXR-DEMO-001',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: 560, margin: '0 auto', padding: '24px 16px' }
const brand = { color: '#3B82F6', fontSize: 22, margin: '0 0 16px', textAlign: 'center' as const }
const card = { backgroundColor: '#f8fafc', borderRadius: 12, padding: '24px 24px 16px' }
const h2 = { fontSize: 20, color: '#0f172a', margin: '0 0 12px' }
const text = { fontSize: 14, lineHeight: '22px', color: '#334155', margin: '0 0 12px' }
const pre = { backgroundColor: '#0f172a', borderRadius: 8, padding: '12px 16px', margin: '12px 0' }
const preText = { fontFamily: 'Menlo, Consolas, monospace', fontSize: 13, color: '#e2e8f0', whiteSpace: 'pre-wrap' as const, margin: 0 }
const messageText = { fontSize: 14, lineHeight: '22px', color: '#0f172a', whiteSpace: 'pre-wrap' as const, margin: '0 0 12px' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: 12, color: '#64748b', textAlign: 'center' as const, margin: 0 }