-- Apports de la doc Bicom M1 : code-barres par plat + infos machine + dégivrage.

-- Code-barres produit (douchette USB) -> plat.
ALTER TABLE dishes_cache ADD COLUMN barcode TEXT;

-- Réglages machine + trame de dégivrage.
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('machine_name',  'Frigo 1'),
  ('cold_type',     'frozen'),   -- 'frozen' (-18°C) | 'chill' (+4°C)
  ('frame_defrost', '');
