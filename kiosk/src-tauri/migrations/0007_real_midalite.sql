-- Active le matériel réel (carte MIDA / MidaLite) validé en live sur la borne.
-- Annule le forçage Sim de 0005 et règle la carte A sur COM1 / 57600 / 8N1.
UPDATE settings SET value = 'real' WHERE key = 'hw_mode';

-- La carte MIDA parle en 57600 baud (et non 9600 par défaut).
UPDATE dispensers SET com_port = 'COM1', baud = 57600, parity = 'none', enabled = 1
WHERE board = 'A';
