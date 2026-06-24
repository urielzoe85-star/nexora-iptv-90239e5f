import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  firstName?: string
  orderRef?: string
  planName?: string
}

const Email = ({ firstName, orderRef, planName }: Props) => {
  const name = firstName?.trim() || 'client'
  const ref = orderRef || '—'
  const plan = planName || 'votre abonnement'
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Paiement reçu — vos accès Nexora IPTV arrivent</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brand}>Nexora IPTV</Heading>
          <Section style={card}>
            <Heading as="h2" style={h2}>Paiement confirmé ✅</Heading>
            <Text style={text}>Bonjour {name},</Text>
            <Text style={text}>
              Nous confirmons la bonne réception de votre paiement pour
              l'abonnement <strong>{plan}</strong>.
            </Text>
            <Section style={refBox}>
              <Text style={refLabel}>Référence commande</Text>
              <Text style={refValue}>{ref}</Text>
            </Section>
            <Text style={text}>
              Vos accès (lien M3U et identifiants Xtream Codes) vous seront
              transmis dans les minutes qui suivent par email et WhatsApp.
            </Text>
            <Text style={text}>
              Merci pour votre confiance.
            </Text>
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
  subject: 'Paiement reçu — vos accès Nexora IPTV arrivent',
  displayName: 'Confirmation de paiement',
  previewData: {
    firstName: 'Jean',
    orderRef: 'NX-12345',
    planName: 'Abonnement 12 mois',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const brand = { color: '#e11d48', fontSize: '20px', margin: '0 0 16px', letterSpacing: '-0.01em' }
const card = { border: '1px solid #eef0f3', borderRadius: '12px', padding: '28px' }
const h2 = { color: '#0f172a', fontSize: '22px', margin: '0 0 16px' }
const text = { color: '#334155', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px' }
const refBox = { background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', margin: '16px 0' }
const refLabel = { color: '#64748b', fontSize: '12px', textTransform: 'uppercase' as const, margin: 0, letterSpacing: '0.04em' }
const refValue = { color: '#0f172a', fontSize: '16px', fontWeight: 600, margin: '4px 0 0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
const hr = { borderColor: '#eef0f3', margin: '20px 0' }
const footer = { color: '#64748b', fontSize: '13px', margin: 0 }