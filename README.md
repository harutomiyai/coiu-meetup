# CoIU Students

CoIUの学生を、問い・関心テーマ・活動・制作物・記事から知るための人物メディアです。イベントなどで出会った学生を、あとから名前やテーマでもう一度見つける入口としても使えます。

## 学生を追加する方法

学生データは `public/data/students.json` で管理しています。画面側に直接学生データを書かず、このJSONに学生オブジェクトを追加してください。

1. 学生写真を `public/images/students/` に追加する
2. `public/data/students.json` の配列末尾に学生オブジェクトを追加する
3. `slug` は他の学生と重複しない英数字・ハイフン形式にする
4. `featured: true` にするとトップの特集学生に表示される
5. `today: true` にするとピックアップ学生に優先表示される

追加例:

```json
{
  "name": "宮井陽音",
  "slug": "haruto-miyai",
  "generation": "1期生",
  "catch": "問いを立て、実装で学びを形にする",
  "image": "/images/students/haruto.jpg",
  "tags": ["教育", "AI", "デザイン", "プログラミング", "活動公開"],
  "talkTopics": ["教育について", "AI活用", "Web制作", "CoIU生活"],
  "currentQuestion": "どうすれば、学びの面白さが人から人へ伝わるのか",
  "currentProject": "CoIU生の問いや活動を可視化するメディアづくり",
  "oneOnOneMessage": "教育、AI、Web制作、CoIU生活について話せます。気軽に話しましょう。",
  "featured": true,
  "today": false,
  "story": "プロフィール本文をここに書きます。",
  "questions": ["今持っている問いをここに書きます"],
  "canConsult": ["関連する経験"],
  "recentActivities": ["最近の活動"],
  "links": {
    "note": "https://note.com/haruto_miyai",
    "youtube": "",
    "podcast": "",
    "x": "",
    "instagram": "",
    "contact": "https://forms.gle/xxxx"
  },
  "noteUsername": "haruto_miyai",
  "noteRssUrl": "https://note.com/haruto_miyai/m/ma9c2b38ca7c1/rss",
  "linkDescriptions": {
    "note": "制作記録や考えたことをnoteで読めます。",
    "contact": "必要な問い合わせを運営へ送れます。"
  }
}
```

JSONでは末尾カンマを使えません。追加後に表示が崩れる場合は、まず `public/data/students.json` のカンマや引用符を確認してください。

## note RSS連動

学生ごとの最新note記事は `noteRssUrl` があればそのURLを優先し、なければ `noteUsername` から取得します。宮井陽音の最新記事は `https://note.com/haruto_miyai/m/ma9c2b38ca7c1/rss` を参照しています。

ローカル開発では Vite の dev server proxy が `/note-rss/{username}/rss` を note に中継します。

```bash
npm run dev
```

ブラウザで `http://localhost:5173/#student/haruto-miyai` を開き、PROFILE 内の LINKS に最新記事が最大3件表示されることを確認してください。RSS取得に失敗した場合も、noteリンクだけが残りページ全体は壊れません。

本番では CORS 回避のため、`workers/note-rss-proxy.js` をデプロイし、ビルド時に Worker URL を渡します。

```bash
VITE_NOTE_RSS_PROXY_BASE="https://your-worker.example.workers.dev" npm run build
```

静的ホスティングだけで Worker を使わない場合、ブラウザから note RSS へ直接アクセスするため、CORS によって最新記事が表示されないことがあります。その場合も外部リンク表示にフォールバックします。
