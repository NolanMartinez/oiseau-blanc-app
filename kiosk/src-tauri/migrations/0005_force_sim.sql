-- Présentation : on force le mode simulateur pour que l'ouverture des casiers
-- fonctionne sans matériel série réel.
UPDATE settings SET value = 'sim' WHERE key = 'hw_mode';
