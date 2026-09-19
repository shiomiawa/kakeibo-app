import { useRef, useState } from 'react';
import { analyzeReceipt } from '../api.js';

// レシート画像の選択（クリック / ドラッグ&ドロップ）と、読み取りリクエストを担当する。
// 読み取りに成功したら onAnalyzed(結果, プレビューURL) を呼ぶ。
export default function ReceiptUploader({ onAnalyzed }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください。');
      return;
    }

    setError('');
    setLoading(true);
    const previewUrl = URL.createObjectURL(file);
    try {
      const result = await analyzeReceipt(file);
      // プレビューURLの解放は、受け取った側（App）が行う
      onAnalyzed(result, previewUrl);
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setError(err.message);
    } finally {
      setLoading(false);
      // 同じファイルをもう一度選んでも change イベントが発火するようにする
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!loading) handleFile(event.dataTransfer.files[0]);
  }

  return (
    <section className="card">
      <h2>レシートを読み込む</h2>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}${loading ? ' busy' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {loading ? (
          <p className="dropzone-text">
            <span className="spinner" aria-hidden="true" />
            レシートを読み取っています…
          </p>
        ) : (
          <>
            <p className="dropzone-text">ここにレシート画像をドロップ、または</p>
            <button type="button" className="btn primary" onClick={() => inputRef.current?.click()}>
              画像を選択
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => handleFile(event.target.files[0])}
        />
      </div>
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
