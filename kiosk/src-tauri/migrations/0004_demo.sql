-- Données de démonstration (présentation) : menu réaliste affecté aux casiers
-- du distributeur A. Idempotent (INSERT OR IGNORE / UPDATE).

INSERT OR IGNORE INTO dishes_cache (id, name, category, description, price, allergens, updated_at) VALUES
  ('demo-1',  'Tagliatelles au saumon',            'Plat chaud', 'Tagliatelles fraîches, saumon fumé, crème citronnée à l''aneth', 990,  '["gluten","poisson","lait"]',                 '2026-06-19'),
  ('demo-2',  'Boeuf bourguignon & grenailles',     'Plat chaud', 'Mijoté de boeuf au vin rouge, champignons, pommes grenailles', 890,  '["sulfites"]',                                '2026-06-19'),
  ('demo-3',  'Couscous boulettes de boeuf',        'Plat chaud', 'Semoule, légumes du couscous, boulettes de boeuf épicées',     950,  '["gluten","celeri"]',                         '2026-06-19'),
  ('demo-4',  'Risotto chorizo & courgettes',       'Plat chaud', 'Risotto crémeux, chorizo doux, courgettes poêlées',           850,  '["lait","sulfites"]',                         '2026-06-19'),
  ('demo-5',  'Pavé de merlu, crème de crustacés',  'Plat chaud', 'Merlu rôti, linguines, crème de crustacés',                   1090, '["gluten","poisson","crustaces","lait"]',     '2026-06-19'),
  ('demo-6',  'Linguine cacio e pepe',              'Plat chaud', 'Linguines, pecorino, poivre noir',                            790,  '["gluten","lait"]',                           '2026-06-19'),
  ('demo-7',  'Tajine poulet citron & olives',      'Plat chaud', 'Poulet fondant, citron confit, olives, semoule',              920,  '[]',                                          '2026-06-19'),
  ('demo-8',  'Sauté de porc en piperade',          'Plat chaud', 'Sauté de porc, piperade basquaise, riz',                      880,  '[]',                                          '2026-06-19'),
  ('demo-9',  'Salade César au poulet',             'Plat froid', 'Salade, poulet grillé, parmesan, croûtons, sauce César',      750,  '["gluten","oeuf","lait","poisson"]',          '2026-06-19'),
  ('demo-10', 'Tarte au citron meringuée',          'Dessert',    'Pâte sablée, crème de citron, meringue dorée',                450,  '["gluten","oeuf","lait"]',                    '2026-06-19');

-- Affectation aux casiers 1..10 du distributeur A (le prix vient du plat).
UPDATE lockers SET dish_id = 'demo-1',  price = NULL WHERE board = 'A' AND box_number = 1;
UPDATE lockers SET dish_id = 'demo-2',  price = NULL WHERE board = 'A' AND box_number = 2;
UPDATE lockers SET dish_id = 'demo-3',  price = NULL WHERE board = 'A' AND box_number = 3;
UPDATE lockers SET dish_id = 'demo-4',  price = NULL WHERE board = 'A' AND box_number = 4;
UPDATE lockers SET dish_id = 'demo-5',  price = NULL WHERE board = 'A' AND box_number = 5;
UPDATE lockers SET dish_id = 'demo-6',  price = NULL WHERE board = 'A' AND box_number = 6;
UPDATE lockers SET dish_id = 'demo-7',  price = NULL WHERE board = 'A' AND box_number = 7;
UPDATE lockers SET dish_id = 'demo-8',  price = NULL WHERE board = 'A' AND box_number = 8;
UPDATE lockers SET dish_id = 'demo-9',  price = NULL WHERE board = 'A' AND box_number = 9;
UPDATE lockers SET dish_id = 'demo-10', price = NULL WHERE board = 'A' AND box_number = 10;
