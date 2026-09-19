import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { CATEGORY_COLORS } from '../constants.js';
import { totalsByCategory, totalsByMonth } from '../utils/aggregate.js';
import { formatMonth, formatYen } from '../utils/format.js';

// Chart.js は使う部品だけ登録する
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// 棒グラフ用: ツールチップの金額を「¥1,234」形式にする
const yenTooltip = {
  callbacks: {
    label: (context) => ` ${formatYen(context.parsed.y)}`,
  },
};

/**
 * カテゴリ別の円グラフ（選択中の期間）と、月別の棒グラフ（全期間）。
 * scopeReceipts: 期間で絞り込んだレシート / allReceipts: 全レシート
 */
export default function Charts({ scopeReceipts, allReceipts, scopeLabel }) {
  const categoryTotals = totalsByCategory(scopeReceipts);
  // 円グラフは合計が0以下のカテゴリ（値引きだけなど）を描画できないため除外する
  const pieRows = categoryTotals.filter((row) => row.total > 0);
  const pieSum = pieRows.reduce((sum, row) => sum + row.total, 0);
  const monthly = totalsByMonth(allReceipts);

  const pieData = {
    labels: pieRows.map((row) => row.category),
    datasets: [
      {
        data: pieRows.map((row) => row.total),
        backgroundColor: pieRows.map((row) => CATEGORY_COLORS[row.category]),
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: monthly.map((row) => formatMonth(row.month)),
    datasets: [
      {
        label: '支出',
        data: monthly.map((row) => row.total),
        backgroundColor: '#4a90d9',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="charts">
      <section className="card">
        <h2>カテゴリ別（{scopeLabel}）</h2>
        {pieRows.length === 0 ? (
          <p className="empty">集計するデータがありません。</p>
        ) : (
          <div className="pie-layout">
            <div className="chart-box">
              <Pie
                data={pieData}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: { label: (context) => ` ${context.label}: ${formatYen(context.parsed)}` },
                    },
                  },
                }}
              />
            </div>
            <table className="summary-table">
              <tbody>
                {pieRows.map((row) => (
                  <tr key={row.category}>
                    <td>
                      <span className="dot" style={{ backgroundColor: CATEGORY_COLORS[row.category] }} />
                      {row.category}
                    </td>
                    <td className="amount">{formatYen(row.total)}</td>
                    <td className="percent">{Math.round((row.total / pieSum) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>月別の支出</h2>
        {monthly.length === 0 ? (
          <p className="empty">集計するデータがありません。</p>
        ) : (
          <div className="chart-box">
            <Bar
              data={barData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: yenTooltip },
                scales: {
                  y: { beginAtZero: true, ticks: { callback: (value) => formatYen(value) } },
                },
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
