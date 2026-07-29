import React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailShell, s } from './_shell'

interface Props {
  subject?: string
  body?: string
  locale?: string
  unsubscribe_token?: string
}

/** Gabarit générique utilisé par l'envoi manuel depuis NCC → Emails. */
const Email = ({ subject, body, locale, unsubscribe_token }: Props) => {
  const title = (subject || 'Message Nexora IPTV').trim()
  const message = (body || '').trim()
  return (
    <EmailShell
      preview={title}
      locale={locale === 'en' ? 'en' : 'fr'}
      unsubscribeToken={unsubscribe_token}
    >
      <Section style={s.card}>
        <Heading as="h2" style={s.h2}>{title}</Heading>
        <Text style={messageText}>{message}</Text>
      </Section>
    </EmailShell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => (d?.subject || 'Message Nexora IPTV').toString(),
  displayName: 'Message Nexora (envoi manuel)',
  previewData: {
    subject: 'Information importante concernant votre abonnement',
    body: 'Bonjour,\n\nVotre abonnement Nexora IPTV a bien été mis à jour.\n\nBonne journée.',
    locale: 'fr',
  },
} satisfies TemplateEntry

const messageText = {
  fontSize: 14,
  lineHeight: '22px',
  color: '#334155',
  whiteSpace: 'pre-wrap' as const,
  margin: '0 0 12px',
}
