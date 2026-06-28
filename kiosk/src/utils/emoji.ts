// Emoji d'illustration par catégorie, pour les plats sans photo.
export function categoryEmoji(category: string | null): string {
  switch ((category ?? "").toLowerCase()) {
    case "plats à chauffer":
    case "plats a chauffer":
    case "plat chaud":
      return "🍝";
    case "salades":
    case "salade":
    case "plat froid":
      return "🥗";
    case "entrée":
    case "entree":
      return "🥘";
    case "desserts":
    case "dessert":
      return "🍰";
    case "boisson":
    case "boissons":
      return "🥤";
    default:
      return "🍽️";
  }
}
