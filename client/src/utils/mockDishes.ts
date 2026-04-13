// Données mockées en attendant l'API Bicom
// À remplacer par de vrais appels API quand la clé sera disponible

export interface Dish {
  id: string;
  name: string;
  category: string;
  price: number;
}

export const MOCK_DISHES: Dish[] = [
  { id: 'dish-001', name: 'Poulet rôti aux herbes', category: 'Plat chaud', price: 8.50 },
  { id: 'dish-002', name: 'Salade niçoise', category: 'Entrée', price: 5.90 },
  { id: 'dish-003', name: 'Lasagnes bolognaise', category: 'Plat chaud', price: 7.80 },
  { id: 'dish-004', name: 'Quiche lorraine', category: 'Plat froid', price: 6.50 },
  { id: 'dish-005', name: 'Saumon en papillote', category: 'Plat chaud', price: 9.90 },
  { id: 'dish-006', name: 'Tarte aux pommes', category: 'Dessert', price: 3.50 },
  { id: 'dish-007', name: 'Velouté de potimarron', category: 'Entrée', price: 4.80 },
  { id: 'dish-008', name: 'Bœuf bourguignon', category: 'Plat chaud', price: 10.50 },
];
