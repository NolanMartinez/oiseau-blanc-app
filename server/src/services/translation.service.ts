import { prisma } from '../utils/prisma';

// Langue source : toujours le français (les plats sont saisis en FR par l'admin).
// Nécessite DEEPL_API_KEY dans les variables d'environnement (clé gratuite `:fx`).
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

const TARGET_LANGS: Array<{ deepl: string; code: string }> = [
  { deepl: 'EN-GB', code: 'en' },
  { deepl: 'ES',    code: 'es' },
  { deepl: 'PT-PT', code: 'pt' },
  { deepl: 'DE',    code: 'de' },
  { deepl: 'IT',    code: 'it' },
];

async function callDeepL(texts: string[], targetLang: string, apiKey: string): Promise<string[]> {
  const res = await fetch(DEEPL_URL, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texts, source_lang: 'FR', target_lang: targetLang }),
  });
  if (!res.ok) throw new Error(`DeepL ${targetLang}: HTTP ${res.status}`);
  const data = (await res.json()) as { translations: { text: string }[] };
  return data.translations.map((t) => t.text);
}

export async function translateDish(
  dishId: string,
  name: string,
  description: string | null,
): Promise<void> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return;

  const texts = [name, ...(description ? [description] : [])];

  await Promise.all(
    TARGET_LANGS.map(async ({ deepl, code }) => {
      try {
        const translated = await callDeepL(texts, deepl, apiKey);
        await prisma.dishTranslation.upsert({
          where: { dishId_language: { dishId, language: code } },
          create: {
            dishId,
            language: code,
            name: translated[0],
            description: description ? (translated[1] ?? null) : null,
          },
          update: {
            name: translated[0],
            description: description ? (translated[1] ?? null) : null,
          },
        });
      } catch {
        // Une langue qui échoue ne bloque pas les autres
      }
    }),
  );
}

export async function translateAllDishes(): Promise<{ translated: number; errors: number }> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return { translated: 0, errors: 0 };

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
