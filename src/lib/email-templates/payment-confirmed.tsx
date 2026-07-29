import React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, s } from './_shell'

interface Props {
  firstName?: string
  orderRef?: string
  planName?: string
  unsubscribe_token?: string
}

const Email = ({ firstName, orderRef, planName, unsubscribe_token }: Props) => {
  const name = firstName?.trim() || 'client'
  const ref = orderRef || '—'
  const plan = planName || 'votre abonnement'
  return (
    <EmailShell
      preview="Paiement reçu — vos accès Nexora IPTV arrivent"
      locale="fr"
      unsubscribeToken={unsubscribe_token}
    >
      <Section style={s.card}>
        <Heading as="h2" style={s.h2}>Paiement confirmé ✅</Heading>
        <Text style={s.text}>Bonjour {name},</Text>
        <Text style={s.text}>
          Nous confirmons la bonne réception de votre paiement pour l'abonnement{' '}
          <strong>{plan}</strong>.
        </Text>
        <Section style={s.info}>
          <Text style={refLabel}>Référence commande</Text>
          <Text style={refValue}>{ref}</Text>
        </Section>
        <Text style={s.text}>
          Vos accès (lien M3U et identifiants Xtream Codes) vous seront transmis dans
          les minutes qui suivent par email et WhatsApp.
        </Text>
        <Text style={s.text}>Merci pour votre confiance.</Text>
      </Section>
    </EmailShell>
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

const refLabel = { color: '#64748b', fontSize: 12, textTransform: 'uppercase' as const, margin: 0, letterSpacing: '0.04em' }
const refValue = { color: '#0B1220', fontSize: 16, fontWeight: 600, margin: '4px 0 0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
