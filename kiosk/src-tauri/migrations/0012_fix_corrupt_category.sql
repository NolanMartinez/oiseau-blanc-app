-- Auto-réparation : d'anciennes synchros (avant le VPS) ont pu laisser dans le
-- cache local une catégorie « Plats à chauffer » avec un octet d'accent corrompu
-- (affichée « Plats � chauffer »). On la fusionne vers la bonne graphie.
-- Le « <> 'Plats à chauffer' » garantit qu'on ne touche jamais la catégorie saine.
UPDATE dishes_cache SET category = 'Plats à chauffer'
WHERE category LIKE 'Plats%chauffer' AND category <> 'Plats à chauffer';
