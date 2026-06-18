// Formatage prix (centimes -> texte) selon la devise réglée.
export function formatPrice(cents: number, currency = "EUR"): string {
  const value = (cents / 100).toFixed(2);
  const symbol = currency === "EUR" ? "€" : currency;
  return `${value} ${symbol}`;
}
