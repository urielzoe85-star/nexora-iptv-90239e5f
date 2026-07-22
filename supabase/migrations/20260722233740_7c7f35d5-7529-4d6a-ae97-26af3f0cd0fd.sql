SELECT enqueue_email('auth_emails'::text, jsonb_build_object(
  'template_name','ncc-notification',
  'recipient_email','urielzoe85@gmail.com',
  'subject','Test domaine notify.account — ' || now()::text,
  'html','<p>Test SMTP sender domain fix</p>',
  'text','Test SMTP sender domain fix',
  'unsubscribe_token','test-'|| gen_random_uuid()::text
));