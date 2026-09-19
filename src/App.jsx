import { useEffect, useState } from 'react';
import Charts from './components/Charts.jsx';
import DraftEditor from './components/DraftEditor.jsx';
import ReceiptList from './components/ReceiptList.jsx';
import ReceiptUploader from './components/ReceiptUploader.jsx';
import { STORAGE_KEY } from './constants.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { filterByMonth, listMonths, receiptTotal } from './utils/aggregate.js';
import { formatMonth, formatYen, todayString } from './utils/format.js';
import { findDuplicateReceipt } from './utils/validate.js';

export default function App() {
  // 登録済みレシート。ローカルストレージに保存されるため、リロードしても残る
  const [receipts, setReceipts] = useLocalStorage(STORAGE_KEY, []);
  // 読み取り直後の確認中データ（「登録」を押すまで保存されない）
  const [draft, setDraft] = useState(null);
  // 登録済みレシートを編集している場合はそのID（新規の読み取り結果を確認中なら null）
  const [editingId, setEditingId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  // 集計・一覧の対象月（空文字は全期間）
  const [month, setMonth] = useState('');

  // プレビュー画像のURLは、差し替え・破棄・画面を閉じるときに解放する
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const months = listMonths(receipts);
  // 選択中の月のデータが削除などで無くなった場合は、全期間に戻す
  const activeMonth = months.includes(month) ? month : '';
  const scopeReceipts = filterByMonth(receipts, activeMonth);
  const scopeTotal = scopeReceipts.reduce((sum, receipt) => sum + receiptTotal(receipt), 0);
  const scopeLabel = activeMonth ? formatMonth(activeMonth) : '全期間';
  // 確認中の内容と同じ購入日・合計金額の登録済みレシート（二重登録の警告用）
  const duplicate = draft ? findDuplicateReceipt(receipts, draft, editingId) : null;

  function handleAnalyzed(result, url) {
    setDraft({
      storeName: result.storeName,
      // 日付が読み取れなかった場合は今日の日付を仮入力し、確認画面で直してもらう
      date: result.date || todayString(),
      total: result.total,
      items: result.items,
    });
    setEditingId(null);
    setPreviewUrl(url);
  }

  function closeDraft() {
    setDraft(null);
    setEditingId(null);
    setPreviewUrl('');
  }

  // 登録済みレシートを確認画面に読み込む（画像は保存していないためプレビューなし）
  function handleEdit(receipt) {
    setDraft({
      storeName: receipt.storeName,
      date: receipt.date,
      // 読み取り時の合計は保存していないため 0 にして、合計の不一致警告は出さない
      total: 0,
      items: receipt.items.map((item) => ({ ...item })),
    });
    setEditingId(receipt.id);
    setPreviewUrl('');
  }

  function handleRegister() {
    const items = draft.items
      .map((item) => ({
        name: item.name.trim(),
        price: Math.round(Number(item.price)) || 0,
        category: item.category,
      }))
      // 商品名も金額も空の行は捨てる
      .filter((item) => item.name !== '' || item.price !== 0)
      .map((item) => ({ ...item, name: item.name || '（名称なし）' }));

    if (items.length === 0) return;

    const storeName = draft.storeName.trim();

    if (editingId) {
      // 編集: ID と登録日時は保ったまま、内容だけ差し替える
      setReceipts((prev) =>
        prev.map((receipt) =>
          receipt.id === editingId ? { ...receipt, storeName, date: draft.date, items } : receipt,
        ),
      );
    } else {
      setReceipts((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          storeName,
          date: draft.date,
          items,
          createdAt: Date.now(),
        },
      ]);
    }
    closeDraft();
  }

  function handleDelete(id) {
    setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));
    // 編集中のレシートを削除した場合は、編集画面も閉じる
    if (id === editingId) closeDraft();
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>レシート家計簿</h1>
        <p>レシートの写真をアップロードすると、Claude が内容を読み取って自動で分類・集計します。</p>
      </header>

      <main>
        <ReceiptUploader onAnalyzed={handleAnalyzed} />

        {draft && (
          <DraftEditor
            // 編集対象が変わったときは、入力内容ごと作り直す
            key={editingId ?? 'new'}
            isEditing={editingId !== null}
            draft={draft}
            duplicate={duplicate}
            previewUrl={previewUrl}
            onChange={setDraft}
            onRegister={handleRegister}
            onCancel={closeDraft}
          />
        )}

        <section className="card toolbar">
          <label>
            表示期間
            <select value={activeMonth} onChange={(event) => setMonth(event.target.value)}>
              <option value="">全期間</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </label>
          <div className="stat">
            <span>{scopeLabel}の支出合計</span>
            <strong>{formatYen(scopeTotal)}</strong>
          </div>
          <div className="stat">
            <span>レシート枚数</span>
            <strong>{scopeReceipts.length}枚</strong>
          </div>
        </section>

        <Charts scopeReceipts={scopeReceipts} allReceipts={receipts} scopeLabel={scopeLabel} />

        <ReceiptList receipts={scopeReceipts} onEdit={handleEdit} onDelete={handleDelete} />
      </main>
    </div>
  );
}
