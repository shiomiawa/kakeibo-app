import { resizeImage } from './utils/image.js';

/**
 * レシート画像をバックエンドに送り、読み取り結果を受け取る。
 * 戻り値: { storeName, date, total, items: [{ name, price, category }] }
 */
export async function analyzeReceipt(file) {
  const { data, mediaType } = await resizeImage(file);

  let response;
  try {
    response = await fetch('/api/receipts/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: data, mediaType }),
    });
  } catch {
    throw new Error('サーバーに接続できませんでした。サーバーが起動しているか確認してください。');
  }

  // エラー時もJSONで { error } が返ってくるが、返ってこない場合に備えて握りつぶす
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `読み取りに失敗しました（${response.status}）`);
  }
  return body;
}
