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
  serialNumber: string | null;
  location: string | null;
  teamviewerId?: string | null;
  teamviewerPassword?: string | null;
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
  costPrice: number | null;
  allergens: string[];
  dlcDays: number | null;
  hasImage: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rating: number | null;
  ratingCount: number;
  salesCount: number;
  _count: { fridgeStocks: number };
}

// Catégorie de plats (endpoint /admin/categories)
export interface Category {
  id: string;
  name: string;
  position: number;
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
  const base = ((import.meta.env.VITE_API_URL as string) || '').replace(/\/$/, '');
  return `${base}/api/v1/public/dishes/${dishId}/image`;
}
