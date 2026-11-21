-- Bank and card details belong only to Revolut, never this database.
ALTER TABLE website.records ADD CONSTRAINT no_bank_detail_fields CHECK (NOT jsonb_path_exists(payload, '$.** ? (@.type() == "object").keyvalue() ? (@.key like_regex "^(bank_?account(_?details|_?number)?|bank_?details|account_?number|sort_?code|iban|bic|swift(_?code)?|routing_?number|card_?number|cvv|cvc)$" flag "i")'));
INSERT INTO website.schema_migrations(version,description) VALUES (2,'Bank and card details excluded; Revolut references and statuses only') ON CONFLICT DO NOTHING;
