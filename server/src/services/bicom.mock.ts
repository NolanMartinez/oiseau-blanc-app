// Service Bicom simulé — en attente de la clé API
// À remplacer par de vrais appels HTTP quand BICOM_API_KEY sera disponible

export interface MockDish {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  allergens: string[];
}

export interface MockFridge {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  online: boolean;
  temperature: number | null;
  lastSync: string;
  dishes: MockDish[];
}

export const MOCK_FRIDGES: MockFridge[] = [
  {
    id: 'f1',
    name: 'Frigo Défense',
    location: 'La Défense — Tour First, 92400 Courbevoie',
    lat: 48.8929,
    lng: 2.2358,
    online: true,
    temperature: 3.8,
    lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    dishes: [
      { id: 'dish-001', name: 'Poulet rôti aux herbes', category: 'Plat chaud', price: 8.50, stock: 5, allergens: ['gluten'] },
      { id: 'dish-003', name: 'Lasagnes bolognaise', category: 'Plat chaud', price: 7.80, stock: 3, allergens: ['gluten', 'lait', 'œuf'] },
      { id: 'dish-005', name: 'Saumon en papillote', category: 'Plat chaud', price: 9.90, stock: 2, allergens: ['poisson'] },
      { id: 'dish-007', name: 'Velouté de potimarron', category: 'Entrée', price: 4.80, stock: 8, allergens: ['lait'] },
      { id: 'dish-006', name: 'Tarte aux pommes', category: 'Dessert', price: 3.50, stock: 6, allergens: ['gluten', 'lait', 'œuf'] },
    ],
  },
  {
    id: 'f2',
    name: 'Frigo Opéra',
    location: 'Opéra — 45 rue de la Paix, 75002 Paris',
    lat: 48.8699,
    lng: 2.3308,
    online: true,
    temperature: 4.1,
    lastSync: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    dishes: [
      { id: 'dish-008', name: 'Bœuf bourguignon', category: 'Plat chaud', price: 10.50, stock: 4, allergens: ['gluten', 'céleri'] },
      { id: 'dish-002', name: 'Salade niçoise', category: 'Entrée', price: 5.90, stock: 9, allergens: ['poisson', 'œuf'] },
      { id: 'dish-004', name: 'Quiche lorraine', category: 'Plat froid', price: 6.50, stock: 7, allergens: ['gluten', 'lait', 'œuf'] },
    ],
  },
  {
    id: 'f3',
    name: 'Frigo Châtelet',
    location: 'Châtelet — 2 rue du Renard, 75004 Paris',
    lat: 48.8602,
    lng: 2.3477,
    online: false,
    temperature: null,
    lastSync: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    dishes: [
      { id: 'dish-009', name: 'Poulet au citron confit', category: 'Plat chaud', price: 9.10, stock: 0, allergens: ['gluten'] },
      { id: 'dish-010', name: 'Mousse au chocolat', category: 'Dessert', price: 2.90, stock: 0, allergens: ['lait', 'œuf'] },
    ],
  },
];
