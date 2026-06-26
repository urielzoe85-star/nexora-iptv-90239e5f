import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>Nexora IPTV</Heading>
        <Section style={card}>
          <Heading as="h2" style={h2}>Confirm reauthentication</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            This code will expire shortly. If you didn't request this, you can safely ignore this email.
          </Text>
          <Text style={footer}>— The Nexora IPTV team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const brand = { color: '#e11d48', fontSize: '20px', margin: '0 0 16px', letterSpacing: '-0.01em' }
const card = { border: '1px solid #eef0f3', borderRadius: '12px', padding: '28px' }
const h2 = { color: '#0f172a', fontSize: '22px', margin: '0 0 16px' }
const text = { color: '#334155', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px' }
const codeStyle = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '24px', fontWeight: 700 as const, color: '#0f172a', background: '#f8fafc', borderRadius: '8px', padding: '14px 16px', letterSpacing: '0.08em', textAlign: 'center' as const, margin: '0 0 20px' }
const hr = { borderColor: '#eef0f3', margin: '20px 0' }
const footer = { color: '#64748b', fontSize: '13px', margin: '0 0 6px' }
