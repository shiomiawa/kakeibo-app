import { receiptTotal } from './aggregate.js';

// 確認・編集画面の入力内容を検証する。
// どちらも「警告」であり、登録は妨げない（値引き行や、同日に同額の買い物は実際にあり得るため）。

// 金額入力欄は入力途中（空欄・「-」だけ）の文字列も入るため、整数の円に直してから扱う
function toYen(value) {
  return Math.round(Number(value)) || 0;
}

/** 金額が負の商品の行番号（0始まり）の一覧を返す */
export function findNegativeItems(items) {
  const indexes = [];
  items.forEach((item, index) => {
    if (toYen(item.price) < 0) indexes.push(index);
  });
  return indexes;
}

/**
 * 購入日と合計金額が同じ、登録済みのレシートを返す（なければ null）。
 * excludeId は、編集中のレシート自身を重複とみなさないための除外ID。
 */
export function findDuplicateReceipt(receipts, draft, excludeId = null) {
  // 商品が無い下書きは、合計 0 円のレシートと一致してしまうため対象外にする
  if (draft.items.length === 0 || draft.date === '') return null;

  const total = draft.items.reduce((sum, item) => sum + toYen(item.price), 0);
  return (
    receipts.find(
      (receipt) =>
        receipt.id !== excludeId && receipt.date === draft.date && receiptTotal(receipt) === total,
    ) ?? null
  );
}
