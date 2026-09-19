import { CATEGORIES } from '../constants.js';
import { monthOf } from './format.js';

/** レシート1件の商品合計金額 */
export function receiptTotal(receipt) {
  return receipt.items.reduce((sum, item) => sum + item.price, 0);
}

/** データに含まれる月（YYYY-MM）の一覧を、新しい順で返す */
export function listMonths(receipts) {
  const months = new Set(receipts.map((receipt) => monthOf(receipt.date)));
  return [...months].sort().reverse();
}

/** 指定した月のレシートだけに絞り込む（month が空文字なら全期間） */
export function filterByMonth(receipts, month) {
  if (!month) return receipts;
  return receipts.filter((receipt) => monthOf(receipt.date) === month);
}

/** カテゴリ別の合計金額を、カテゴリ定義の順で返す */
export function totalsByCategory(receipts) {
  const totals = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  for (const receipt of receipts) {
    for (const item of receipt.items) {
      totals[item.category] = (totals[item.category] ?? 0) + item.price;
    }
  }
  return CATEGORIES.map((category) => ({ category, total: totals[category] }));
}

/** 月別の合計金額を、古い月から順に返す */
export function totalsByMonth(receipts) {
  const totals = new Map();
  for (const receipt of receipts) {
    const month = monthOf(receipt.date);
    totals.set(month, (totals.get(month) ?? 0) + receiptTotal(receipt));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}
