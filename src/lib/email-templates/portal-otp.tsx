import React from 'react'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  code?: string
  email?: string
}

const Email = ({ code = '000000', email }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification Nexora IPTV : {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nexora IPTV</Heading>
        <Text style={text}>Bonjour,</Text>
        <Text style={text}>
          Voici votre code de vérification pour accéder à votre Espace Client{email ? ` (${email})` : ''} :
        </Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{code}</Text>
        </Section>
        <Text style={muted}>Ce code est valable 10 minutes.</Text>
        <Hr style={hr} />
        <Text style={muted}>
          Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.
        </Text>
        <Text style={muted}>— L'équipe Nexora IPTV</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Nexora IPTV — Code ${data?.code ?? ''}`.trim(),
  displayName: 'Espace Client — Code OTP',
  previewData: { code: '123456', email: 'client@example.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '520px', margin: '0 auto' }
const h1 = { color: '#0f172a', fontSize: '22px', margin: '0 0 16px' }
const text = { color: '#0f172a', fontSize: '15px', lineHeight: '22px' }
const muted = { color: '#64748b', fontSize: '13px', lineHeight: '20px' }
const codeBox = {
  background: '#0f172a', borderRadius: '12px', padding: '18px', textAlign: 'center' as const, margin: '18px 0',
}
const codeStyle = {
  color: '#ffffff', fontSize: '30px', letterSpacing: '10px', fontWeight: 700, margin: 0,
}
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }