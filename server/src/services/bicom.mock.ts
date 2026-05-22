// Service Bicom simulé — en attente de la clé API
// À remplacer par de vrais appels HTTP quand BICOM_API_KEY sera disponible.
//
// Les plats et le stock vivent désormais en base (modèles Dish / FridgeStock).
// Le mock ne fournit plus que les métadonnées matérielles des frigos.

export interface MockFridge {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  online: boolean;
  temperature: number | null;
  lastSync: string;
}

export const MOCK_FRIDGES: MockFridge[] = [
  {
    id: 'f1',
    name: 'Frigo Valenciennes Centre',
    location: 'Place d\'Armes, 59300 Valenciennes',
    lat: 50.3575,
    lng: 3.5233,
    online: true,
    temperature: 3.8,
    lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'f2',
    name: 'Frigo CHV',
    location: 'Centre Hospitalier de Valenciennes — Av. Désandrouin, 59300 Valenciennes',
    lat: 50.3703,
    lng: 3.5068,
    online: true,
    temperature: 4.1,
    lastSync: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'f3',
    name: 'Frigo Maubeuge',
    location: 'Zone industrielle, 59600 Maubeuge',
    lat: 50.2767,
    lng: 3.9726,
    online: false,
    temperature: null,
    lastSync: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

export function getFridgeMeta(id: string): MockFridge | undefined {
  return MOCK_FRIDGES.find((f) => f.id === id);
}
