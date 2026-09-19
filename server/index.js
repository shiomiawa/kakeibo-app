// バックエンド（Node.js / Express）。
// ブラウザにAPIキーを渡さないため、Claude API の呼び出しはすべてこのサーバーで行う。

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIES, DEFAULT_CATEGORY } from '../shared/categories.js';

// 使用モデル: Claude Haiku の最新バージョン（Haiku 4.5）
const MODEL = 'claude-haiku-4-5';

const PORT = Number(process.env.PORT) || 3001;

// Claude API が受け付ける画像形式と、1枚あたりの最大サイズ（5MB）
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    '[警告] ANTHROPIC_API_KEY が設定されていません。.env.example を .env にコピーしてキーを設定してください。',
  );
}

// APIキーは環境変数 ANTHROPIC_API_KEY から自動で読み込まれる
const client = new Anthropic();

// レシート読み取り結果を受け取るためのツール定義。
// tool_choice で呼び出しを強制し、常にこのスキーマに沿ったJSONを返させる。
const RECEIPT_TOOL = {
  name: 'record_receipt',
  description: 'レシート画像から読み取った内容を記録する。',
  input_schema: {
    type: 'object',
    properties: {
      is_receipt: {
        type: 'boolean',
        description: '画像がレシート・領収書として読み取れる場合は true、それ以外は false。',
      },
      store_name: {
        type: 'string',
        description: '店舗名。読み取れない場合は空文字。',
      },
      date: {
        type: 'string',
        description: '購入日（YYYY-MM-DD形式）。読み取れない場合は空文字。',
      },
      total: {
        type: 'integer',
        description: 'レシートに記載された合計金額（円）。読み取れない場合は 0。',
      },
      items: {
        type: 'array',
        description: '購入した商品の一覧。',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '商品名。' },
            price: {
              type: 'integer',
              description: '金額（円、整数）。値引き行は負の値にする。',
            },
            category: {
              type: 'string',
              enum: CATEGORIES,
              description: '商品のカテゴリ。',
            },
          },
          required: ['name', 'price', 'category'],
        },
      },
    },
    required: ['is_receipt', 'store_name', 'date', 'total', 'items'],
  },
};

const SYSTEM_PROMPT = `あなたは日本語のレシートを読み取る家計簿アシスタントです。
画像のレシートから、店舗名・購入日・合計金額・商品ごとの名前と金額を正確に読み取り、record_receipt ツールで記録してください。

ルール:
- 金額は円単位の整数で、レシートに印字されている値をそのまま使う（推測で補わない）。
- 商品名は印字どおりに書く。読み取れない文字は無理に補わず、読める範囲で書く。
- 値引き・割引の行は、負の金額の商品として含める。
- 小計・合計・税・お預かり・お釣り・ポイントの行は商品に含めない。
- 購入日は YYYY-MM-DD 形式にする（和暦は西暦に直す）。年が印字されていない場合は、指示された今日の日付から最も自然な年を選ぶ。日付が読めなければ空文字にする。
- 各商品は次のカテゴリのいずれか1つに分類する: ${CATEGORIES.join('、')}。
  - 食費: スーパーやコンビニで買う食品・飲料・酒類
  - 外食: レストラン・カフェ・居酒屋・テイクアウト・デリバリーなど、調理済みの食事
  - 日用品: 洗剤・ティッシュ・文房具・雑貨など
  - 判断に迷う場合は「${DEFAULT_CATEGORY}」にする。
- 画像がレシートや領収書でない場合は is_receipt を false にし、items は空配列にする。`;

/** ローカル日付を YYYY-MM-DD 形式で返す */
function todayString() {
  return new Date().toLocaleDateString('sv-SE');
}

/** Claude の出力を検証・整形する（想定外の値でもアプリが壊れないようにする） */
function normalizeReceipt(input) {
  const items = (Array.isArray(input.items) ? input.items : [])
    .map((item) => ({
      name: String(item?.name ?? '').trim(),
      price: Math.round(Number(item?.price)) || 0,
      category: CATEGORIES.includes(item?.category) ? item.category : DEFAULT_CATEGORY,
    }))
    .filter((item) => item.name !== '');

  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '') ? input.date : '';

  return {
    storeName: String(input.store_name ?? '').trim(),
    date,
    total: Math.round(Number(input.total)) || 0,
    items,
  };
}

const app = express();
// 画像はbase64で送られてくるため、上限を大きめに設定する
app.use(express.json({ limit: '10mb' }));

// レシート画像を解析するAPI
app.post('/api/receipts/analyze', async (req, res) => {
  const { image, mediaType } = req.body ?? {};

  if (typeof image !== 'string' || image === '') {
    return res.status(400).json({ error: '画像データがありません。' });
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return res
      .status(400)
      .json({ error: '対応していない画像形式です（JPEG / PNG / GIF / WebP に対応）。' });
  }
  // base64文字列の長さから、元の画像サイズを概算する
  if (Math.floor((image.length * 3) / 4) > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: '画像サイズが大きすぎます（5MBまで）。' });
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [RECEIPT_TOOL],
      tool_choice: { type: 'tool', name: RECEIPT_TOOL.name },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: `今日の日付は ${todayString()} です。このレシートを読み取ってください。` },
          ],
        },
      ],
    });

    // 出力が途中で切れている場合は、不完全なデータを返さない
    if (response.stop_reason === 'max_tokens') {
      return res
        .status(502)
        .json({ error: 'レシートの内容が多すぎて読み取りきれませんでした。' });
    }

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse) {
      return res.status(502).json({ error: 'レシートの読み取り結果を取得できませんでした。' });
    }

    if (!toolUse.input.is_receipt) {
      return res
        .status(422)
        .json({ error: 'レシートとして認識できませんでした。別の画像でお試しください。' });
    }

    return res.json(normalizeReceipt(toolUse.input));
  } catch (error) {
    // 詳細はサーバーのログにのみ出力し、クライアントには要点だけ返す
    console.error('[Claude API エラー]', error?.status ?? '', error?.message ?? error);

    if (error instanceof Anthropic.AuthenticationError) {
      return res
        .status(500)
        .json({ error: 'APIキーが無効です。サーバーの .env の設定を確認してください。' });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res
        .status(429)
        .json({ error: 'リクエストが集中しています。しばらくしてからやり直してください。' });
    }
    if (error instanceof Anthropic.BadRequestError) {
      return res
        .status(400)
        .json({ error: '画像を処理できませんでした。別の画像でお試しください。' });
    }
    if (error instanceof Anthropic.APIError) {
      return res.status(502).json({ error: 'Claude API でエラーが発生しました。' });
    }
    return res.status(500).json({ error: '予期しないエラーが発生しました。' });
  }
});

// 本番用: ビルド済みのフロントエンド（dist）があれば配信する
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`サーバーを起動しました: http://localhost:${PORT}`);
});
