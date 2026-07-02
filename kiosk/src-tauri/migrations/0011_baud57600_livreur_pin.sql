-- Toutes les cartes verrous MidaLite parlent en 57600 baud : on fixe ce débit
-- par défaut sur TOUTES les cartes (A..E), pas seulement la A, pour éviter d'avoir
-- à le régler à la main à chaque installation.
UPDATE dispensers SET baud = 57600, parity = 'none';

-- Code PIN dédié aux livreurs (accès limité au réassort). Distinct du PIN admin.
INSERT OR IGNORE INTO settings (key, value) VALUES ('livreur_pin', '0000');
