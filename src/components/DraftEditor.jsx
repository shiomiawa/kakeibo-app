import { useEffect, useRef } from 'react';
import { CATEGORIES, DEFAULT_CATEGORY } from '../constants.js';
import { formatYen } from '../utils/format.js';

// 金額入力欄は、入力途中（空欄・「-」だけ）の状態も許すため文字列も受け付ける
function toNumber(value) {
  return Math.round(Number(value)) || 0;
}

// 読み取り結果の確認・修正フォーム。「登録」を押すまで保存はされない。
// AIの読み取りミス（金額・商品名・カテゴリ）をここで直せる。
// isEditing が true のときは、登録済みレシートの編集画面として使う。
export default function DraftEditor({
  isEditing = false,
  draft,
  previewUrl,
  onChange,
  onRegister,
  onCancel,
}) {
  const sectionRef = useRef(null);

  // 表示されたら画面内に移動する（一覧の下のほうから編集を始めた場合に見失わないため）
  useEffect(() => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const itemsSum = draft.items.reduce((sum, item) => sum + toNumber(item.price), 0);
  const totalMismatch = draft.total > 0 && draft.total !== itemsSum;
  const canRegister = draft.items.length > 0 && draft.date !== '';

  function updateItem(index, patch) {
    onChange({
      ...draft,
      items: draft.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  function removeItem(index) {
    onChange({ ...draft, items: draft.items.filter((_, i) => i !== index) });
  }

  function addItem() {
    onChange({
      ...draft,
      items: [...draft.items, { name: '', price: 0, category: DEFAULT_CATEGORY }],
    });
  }

  function handlePriceChange(index, value) {
    // 数字と先頭のマイナス（値引き）のみ受け付ける
    if (/^-?\d*$/.test(value)) updateItem(index, { price: value });
  }

  return (
    <section className="card" ref={sectionRef}>
      <h2>{isEditing ? '登録済みレシートの編集' : '読み取り結果の確認'}</h2>
      <p className="hint">
        {isEditing
          ? '内容を修正して「保存」を押してください。'
          : '内容を確認し、必要なら修正してから「登録」を押してください。'}
      </p>

      <div className="draft-layout">
        {previewUrl && <img className="preview" src={previewUrl} alt="読み込んだレシート" />}

        <div className="draft-form">
          <div className="field-row">
            <label>
              店舗名
              <input
                type="text"
                value={draft.storeName}
                onChange={(event) => onChange({ ...draft, storeName: event.target.value })}
              />
            </label>
            <label>
              購入日
              <input
                type="date"
                value={draft.date}
                onChange={(event) => onChange({ ...draft, date: event.target.value })}
              />
            </label>
          </div>

          <div className="table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th>商品名</th>
                  <th>金額（円）</th>
                  <th>カテゴリ</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {draft.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={item.name}
                        aria-label="商品名"
                        onChange={(event) => updateItem(index, { name: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="price-input"
                        value={item.price}
                        aria-label="金額"
                        onChange={(event) => handlePriceChange(index, event.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={item.category}
                        aria-label="カテゴリ"
                        onChange={(event) => updateItem(index, { category: event.target.value })}
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn icon"
                        aria-label="この商品を削除"
                        onClick={() => removeItem(index)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="btn" onClick={addItem}>
            ＋ 商品を追加
          </button>

          <p className="draft-total">
            商品合計: <strong>{formatYen(itemsSum)}</strong>
          </p>
          {totalMismatch && (
            <p className="message warn">
              レシート記載の合計（{formatYen(draft.total)}）と商品合計が一致しません。
              読み取り漏れや、税抜き表記の可能性があります。
            </p>
          )}
          {draft.items.length === 0 && (
            <p className="message warn">商品が1件もありません。商品を追加してください。</p>
          )}

          <div className="actions">
            <button type="button" className="btn primary" disabled={!canRegister} onClick={onRegister}>
              {isEditing ? '保存' : '登録'}
            </button>
            <button type="button" className="btn" onClick={onCancel}>
              {isEditing ? 'キャンセル' : '破棄'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
