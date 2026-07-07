-- Purge des données de démonstration restées en production.
-- Les plats de démo (id « demo-% ») polluaient la liste d'affectation et étaient
-- repoussés au serveur. On libère les casiers qui les référencent, puis on supprime
-- les plats de démo du cache local. La borne ne les repousse donc plus.
UPDATE lockers SET dish_id = NULL, price = NULL, expiry_date = NULL, state = 'idle'
WHERE dish_id LIKE 'demo-%';

DELETE FROM dishes_cache WHERE id LIKE 'demo-%';
