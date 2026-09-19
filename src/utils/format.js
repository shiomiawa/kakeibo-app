const yenFormatter = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });

/** 金額を「¥1,234」形式にする */
export function formatYen(amount) {
  return yenFormatter.format(amount);
}

/** ローカル日付の今日を YYYY-MM-DD 形式で返す */
export function todayString() {
  return new Date().toLocaleDateString('sv-SE');
}

/** YYYY-MM-DD から YYYY-MM を取り出す */
export function monthOf(date) {
  return date.slice(0, 7);
}

/** YYYY-MM を「2026年9月」形式にする */
export function formatMonth(month) {
  const [year, m] = month.split('-');
  return `${year}年${Number(m)}月`;
}
