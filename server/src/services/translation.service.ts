import { prisma } from '../utils/prisma';

// MyMemory — gratuit, sans clé API.
// Ajouter MYMEMORY_EMAIL dans les variables d'env pour passer de 1 000 à 10 000 req/jour.
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

const TARGET_LANGS = [
  { code: 'en', mm: 'en' },
  { code: 'es', mm: 'es' },
  { code: 'pt', mm: 'pt' },
  { code: 'de', mm: 'de' },
  { code: 'it', mm: 'it' },
];

async function translateText(text: string, targetLang: string): Promise<string> {
  const url = new URL(MYMEMORY_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `fr|${targetLang}`);
  const email = process.env.MYMEMORY_EMAIL;
  if (email) url.searchParams.set('de', email);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MyMemory ${targetLang}: HTTP ${res.status}`);
  const data = (await res.json()) as {
    responseData: { translatedText: string };
    responseStatus: number;
  };
  // 206 = traduction partielle (acceptable)
  if (data.responseStatus !== 200 && data.responseStatus !== 206) {
    throw new Error(`MyMemory erreur: ${data.responseStatus}`);
  }
  return data.responseData.translatedText;
}

export async function translateDish(
  dishId: string,
  name: string,
  description: string | null,
): Promise<void> {
  await Promise.all(
    TARGET_LANGS.map(async ({ code, mm }) => {
      try {
        const translatedName = await translateText(name, mm);
        const translatedDescription = description ? await translateText(description, mm) : null;
        await prisma.dishTranslation.upsert({
          where: { dishId_language: { dishId, language: code } },
          create: { dishId, language: code, name: translatedName, description: translatedDescription },
          update: { name: translatedName, description: translatedDescription },
        });
      } catch {
        // Une langue qui échoue ne bloque pas les autres
      }
    }),
  );
}

export async function translateAllDishes(): Promise<{ translated: number; errors: number }> {
  const dishes = await prisma.dish.findMany({ select: { id: true, name: true, description: true } });
  let translated = 0;
  let errors = 0;
  for (const dish of dishes) {
    try {
      await translateDish(dish.id, dish.name, dish.description);
      translated++;
    } catch {
      errors++;
    }
  }
  return { translated, errors };
}
