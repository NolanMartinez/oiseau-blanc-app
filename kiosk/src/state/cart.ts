// Ligne de panier : réserve un casier précis pour un plat.
export interface CartLine {
  lockerId: number;
  dishId: string;
  name: string;
  priceCents: number;
  board: string;
  boxNumber: number;
  address: number | null;
}
