import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>Nexora IPTV</Heading>
        <Section style={card}>
          <Heading as="h2" style={h2}>Your login link</Heading>
          <Text style={text}>
            Click the button below to log in to {siteName}. This link will expire shortly.
          </Text>
          <Button style={button} href={confirmationUrl}>Log in</Button>
          <Hr style={hr} />
          <Text style={footer}>
            If you didn't request this link, you can safely ignore this email.
          </Text>
          <Text style={footer}>— The Nexora IPTV team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const brand = { color: '#e11d48', fontSize: '20px', margin: '0 0 16px', letterSpacing: '-0.01em' }
const card = { border: '1px solid #eef0f3', borderRadius: '12px', padding: '28px' }
const h2 = { color: '#0f172a', fontSize: '22px', margin: '0 0 16px' }
const text = { color: '#334155', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px' }
const button = { backgroundColor: '#e11d48', color: '#ffffff', fontSize: '14px', fontWeight: 600, borderRadius: '8px', padding: '12px 20px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 4px' }
const hr = { borderColor: '#eef0f3', margin: '20px 0' }
const footer = { color: '#64748b', fontSize: '13px', margin: '0 0 6px' }
