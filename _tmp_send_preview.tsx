import React from 'react'
import { render } from 'react-email'
import { createClient } from '@supabase/supabase-js'
import { template } from './src/lib/email-templates/ncc-notification'

const to = 'urielzoe85@gmail.com'
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const subject = 'Aperçu du nouveau format des emails Nexora IPTV'
const body = `Bonjour,

Voici un aperçu du nouveau format utilisé pour tous les emails envoyés depuis votre espace NCC.

Vous retrouverez désormais automatiquement :
- l'en-tête de marque Nexora (bande sombre + or)
- le contenu de votre message
- la signature professionnelle avec WhatsApp, Telegram, site et espace client
- le lien de désabonnement conforme

Bonne réception.`

const norm = to.toLowerCase()
let token: string
const { data: ex } = await sb.from('email_unsubscribe_tokens').select('token, used_at').eq('email', norm).maybeSingle()
if (ex?.token && !ex.used_at) token = ex.token as string
else {
  token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('')
  await sb.from('email_unsubscribe_tokens').upsert({ token, email: norm }, { onConflict: 'email', ignoreDuplicates: true })
  const { data: st } = await sb.from('email_unsubscribe_tokens').select('token').eq('email', norm).maybeSingle()
  token = st!.token as string
}

const el = React.createElement(template.component, { subject, body, unsubscribe_token: token })
const html = await render(el)
const text = await render(el, { plainText: true })

const messageId = crypto.randomUUID()
await sb.from('email_send_log').insert({ message_id: messageId, template_name: 'ncc-notification', recipient_email: to, status: 'pending' })
const { error } = await sb.rpc('enqueue_email', {
  queue_name: 'transactional_emails',
  payload: {
    message_id: messageId, to,
    from: 'Nexora IPTV <noreply@send.nexora-iptv.com>',
    sender_domain: 'send.nexora-iptv.com',
    subject, html, text,
    purpose: 'transactional', label: 'ncc-notification',
    idempotency_key: `ncc-preview-${messageId}`,
    unsubscribe_token: token,
    queued_at: new Date().toISOString(),
  },
})
console.log('enqueue error:', error?.message ?? 'none', 'msg', messageId)
const d = await sb.rpc('email_queue_dispatch')
console.log('dispatch:', d.error?.message ?? 'ok')
