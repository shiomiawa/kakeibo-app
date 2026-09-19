// Claude API は長辺 1568px を超える画像を内部で縮小するため、
// あらかじめブラウザ側で縮小して送信量を減らす（スマホの写真は数MBあるため）。
const MAX_EDGE = 1568;

/**
 * 画像ファイルを縮小し、JPEG の base64 文字列（data URL の接頭辞なし）にして返す。
 * JPEG に統一することで、HEIC 以外の一般的な形式や5MB超の写真もそのまま扱える。
 */
export async function resizeImage(file) {
  let bitmap;
  try {
    // createImageBitmap はスマホ写真のEXIF回転も反映して読み込む
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('この画像は読み込めませんでした。JPEG / PNG / WebP などの画像を選んでください。');
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext('2d');
  // 透過PNGが黒背景にならないよう、先に白で塗りつぶす
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  return { data: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
}
