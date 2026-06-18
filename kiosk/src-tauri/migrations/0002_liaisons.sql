-- Liaisons matériel : débit/parité par carte, adresse physique par casier,
-- réglages du protocole d'ouverture.

ALTER TABLE dispensers ADD COLUMN baud INTEGER NOT NULL DEFAULT 9600;
ALTER TABLE dispensers ADD COLUMN parity TEXT NOT NULL DEFAULT 'none';

-- Adresse physique de la porte sur la carte (si le câblage ne suit pas 1..32).
-- NULL = on utilise box_number.
ALTER TABLE lockers ADD COLUMN address INTEGER;

-- Réglages du pilote matériel.
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('hw_mode',        'sim'),               -- 'sim' | 'real'
  ('frame_open',     '02 {board} {box} {xor}'),
  ('frame_close_all',''),
  ('frame_clear',    ''),
  ('box_base',       '1');                 -- numérotation des portes : 0 ou 1
