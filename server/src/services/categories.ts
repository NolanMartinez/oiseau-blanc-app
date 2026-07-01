import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// Ordre voulu par le client.
const DEFAULTS = ['Entrées', 'Salades', 'Plats à chauffer', 'Desserts'];

/**
 * Crée la table `categories` si elle n'existe pas (l'hébergement Railway ne joue
 * pas les migrations Prisma) et la pré-remplit avec les catégories par défaut.
 * Idempotent : sûr à appeler à chaque démarrage.
 */
export async function ensureCategories(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(191) NOT NULL,
        name VARCHAR(191) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE INDEX categories_name_key (name)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    const count = await prisma.category.count();
    if (count === 0) {
      const now = new Date();
      await prisma.category.createMany({
        data: DEFAULTS.map((name, i) => ({ name, position: i, createdAt: now, updatedAt: now })),
      });
      logger.info('Catégories par défaut créées');
    }
  } catch (e) {
    logger.error({ e }, 'ensureCategories a échoué');
  }
}
