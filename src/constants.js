// カテゴリの一覧は、サーバーと共通の定義を再エクスポートする
export { CATEGORIES, DEFAULT_CATEGORY } from '../shared/categories.js';

// グラフ・バッジで使うカテゴリごとの色
export const CATEGORY_COLORS = {
  食費: '#4caf7d',
  外食: '#f2994a',
  日用品: '#4a90d9',
  交通費: '#9b6dd6',
  '医療・健康': '#e5566d',
  '衣服・美容': '#e879b9',
  娯楽: '#f2c94c',
  '光熱費・通信': '#2bb5b8',
  その他: '#9aa3ad',
};

// ローカルストレージの保存キー（データ形式を変える場合は末尾のバージョンを上げる）
export const STORAGE_KEY = 'kakeibo.receipts.v1';
