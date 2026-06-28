-- Renomme les catégories des plats de démo selon la demande (mail Frédéric).
UPDATE dishes_cache SET category = 'Plats à chauffer' WHERE id LIKE 'demo-%' AND category = 'Plat chaud';
UPDATE dishes_cache SET category = 'Salades'          WHERE id LIKE 'demo-%' AND category = 'Plat froid';
UPDATE dishes_cache SET category = 'Desserts'         WHERE id LIKE 'demo-%' AND category = 'Dessert';
