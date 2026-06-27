
ALTER TYPE iptv_account_status ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE iptv_account_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE iptv_account_status ADD VALUE IF NOT EXISTS 'disabled';
