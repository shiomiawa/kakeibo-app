import { CATEGORY_COLORS } from '../constants.js';
import { receiptTotal } from '../utils/aggregate.js';
import { formatYen } from '../utils/format.js';

// 登録済みのレシートを、日付の新しい順に一覧表示する。
export default function ReceiptList({ receipts, onDelete }) {
  const sorted = [...receipts].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );

  function handleDelete(receipt) {
    if (window.confirm(`${receipt.date} ${receipt.storeName || 'レシート'} を削除しますか？`)) {
      onDelete(receipt.id);
    }
  }

  return (
    <section className="card">
      <h2>レシート一覧</h2>
      {sorted.length === 0 ? (
        <p className="empty">登録されたレシートはありません。</p>
      ) : (
        <ul className="receipt-list">
          {sorted.map((receipt) => (
            <li key={receipt.id} className="receipt">
              <div className="receipt-head">
                <span className="receipt-date">{receipt.date}</span>
                <span className="receipt-store">{receipt.storeName || '（店舗名なし）'}</span>
                <strong className="receipt-total">{formatYen(receiptTotal(receipt))}</strong>
                <button type="button" className="btn icon" onClick={() => handleDelete(receipt)}>
                  削除
                </button>
              </div>
              <table className="items-table readonly">
                <tbody>
                  {receipt.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>
                        <span
                          className="badge"
                          style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="amount">{formatYen(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
