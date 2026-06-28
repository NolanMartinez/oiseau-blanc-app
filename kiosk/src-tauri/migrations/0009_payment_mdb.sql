-- Carte de paiement MDB (TPE) : port COM2 @ 115200 (identifié en live, FW1.8.00).
-- mdb_enabled reste à 0 : l'admin l'active pour exiger le paiement par carte.
INSERT OR IGNORE INTO settings (key, value) VALUES ('payment_com', 'COM2');
INSERT OR IGNORE INTO settings (key, value) VALUES ('payment_baud', '115200');
UPDATE settings SET value = 'COM2' WHERE key = 'payment_com';
UPDATE settings SET value = '115200' WHERE key = 'payment_baud';
