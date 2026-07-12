// Format harga dengan presisi dinamis. Token seperti PEPE/SHIB harganya
// bisa sekecil $0.000001 — kalau dipaksa 2 desimal, hasilnya selalu "0.00"
// dan tidak informatif sama sekali.
export function formatPrice(price: number): string {
  if (price === 0) return "0.00";
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}
