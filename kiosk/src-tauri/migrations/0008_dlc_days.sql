-- DLC en jours par plat (récupérée de la fiche produit lors de la synchro).
-- Sert à pré-remplir automatiquement la date limite de vente d'un casier.
ALTER TABLE dishes_cache ADD COLUMN dlc_days INTEGER;
