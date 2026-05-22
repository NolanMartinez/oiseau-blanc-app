// Plat tel que renvoyé dans un frigo (endpoint /frigos)
export interface FridgeDish {
  id: string;
  stockId: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  allergens: string[];
  stock: number;
  expiryDate: string | null;
  promoPercent: number | null;
  finalPrice: number;
  hasImage: boolean;
}

export interface Fridge {
  id: string;
  name: string;
  location: string;
  online: boolean;
  temperature: number | null;
  lastSync: string;
  dishes: FridgeDish[];
}

// Plat du catalogue (endpoint /admin/dishes)
export interface CatalogDish {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  allergens: string[];
  hasImage: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { fridgeStocks: number };
}

// Liste des 14 allergènes à déclaration obligatoire (UE)
export const ALLERGENS = [
  'gluten',
  'crustacés',
  'œuf',
  'poisson',
  'arachides',
  'soja',
  'lait',
  'fruits à coque',
  'céleri',
  'moutarde',
  'sésame',
  'sulfites',
  'lupin',
  'mollusques',
];

export const DISH_CATEGORIES = ['Entrée', 'Plat chaud', 'Plat froid', 'Dessert', 'Boisson'];

export function dishImageUrl(dishId: string): string {
  return `/api/v1/public/dishes/${dishId}/image`;
}
