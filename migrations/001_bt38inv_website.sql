-- Dedicated website database: bt38inv_website. No inventory tables are modified.
CREATE SCHEMA IF NOT EXISTS website;
CREATE TABLE IF NOT EXISTS website.sites (
  site_id text PRIMARY KEY,
  domain text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO website.sites(site_id,domain) VALUES ('bt38inv','bt38inv.com') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS website.records (
  site_id text NOT NULL REFERENCES website.sites(site_id),
  record_key text NOT NULL,
  body text NOT NULL,
  payload jsonb GENERATED ALWAYS AS (body::jsonb) STORED,
  deleted boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(site_id,record_key),
  CHECK(length(record_key) BETWEEN 1 AND 1500)
);
CREATE INDEX IF NOT EXISTS website_records_prefix ON website.records(site_id,record_key text_pattern_ops) WHERE NOT deleted;
CREATE TABLE IF NOT EXISTS website.schema_migrations (
  version integer PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO website.schema_migrations(version,description) VALUES (1,'BT38inv.com isolated website records') ON CONFLICT DO NOTHING;
CREATE OR REPLACE VIEW website.customer_enquiries AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'records/enquiry/%';
CREATE OR REPLACE VIEW website.partnership_applications AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'records/partner/%';
CREATE OR REPLACE VIEW website.referral_partners AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'referrals/partners/%';
CREATE OR REPLACE VIEW website.referral_commissions AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'referrals/ledger/%';
CREATE OR REPLACE VIEW website.billing_orders AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'checkout/orders/%';
CREATE OR REPLACE VIEW website.invoices AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'checkout/invoices/%';
CREATE OR REPLACE VIEW website.customer_accounts AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'customers/accounts/%';
CREATE OR REPLACE VIEW website.onboarding_records AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'customers/onboarding/%';
CREATE OR REPLACE VIEW website.support_tickets AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'support/tickets/%';
CREATE OR REPLACE VIEW website.partner_payout_status AS SELECT record_key,payload,created_at,updated_at FROM website.records WHERE site_id='bt38inv' AND NOT deleted AND record_key LIKE 'referrals/payout-status/%';
