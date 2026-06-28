-- DLC (durée de conservation) en jours, saisie dans la fiche produit.
-- Sert à pré-remplir automatiquement la date limite de vente côté borne.
ALTER TABLE "dishes" ADD COLUMN "dlc_days" INTEGER;
