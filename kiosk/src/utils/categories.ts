// Ordre d'affichage des catégories voulu par le client (Frédéric) :
// Entrées, Salades, Plats à chauffer, Desserts. Toute catégorie hors liste
// est rejetée en fin, triée alphabétiquement.

export const CATEGORY_ORDER = ["Entrées", "Salades", "Plats à chauffer", "Desserts"];

// Normalise pour comparer sans dépendre de la casse / des accents / espaces.
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const ORDER_NORM = CATEGORY_ORDER.map(norm);

/** Rang d'une catégorie dans l'ordre voulu (les inconnues passent après). */
export function categoryRank(cat: string | null | undefined): number {
  if (!cat) return CATEGORY_ORDER.length + 1;
  const i = ORDER_NORM.indexOf(norm(cat));
  return i === -1 ? CATEGORY_ORDER.length : i;
}

/** Trie une liste de catégories selon l'ordre voulu, puis alphabétiquement. */
export function sortCategories(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ra = categoryRank(a);
    const rb = categoryRank(b);
    return ra !== rb ? ra - rb : a.localeCompare(b);
  });
}

/** Comparateur (catégorie puis nom) pour trier des éléments porteurs d'une catégorie. */
export function byCategoryThenName(
  aCat: string | null | undefined,
  aName: string,
  bCat: string | null | undefined,
  bName: string,
): number {
  const ra = categoryRank(aCat);
  const rb = categoryRank(bCat);
  return ra !== rb ? ra - rb : aName.localeCompare(bName);
}
