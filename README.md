# CoIU PEOPLE

CoIUの学生が持つ問い、関心、活動を可視化し、1on1のきっかけをつくる学生メディアです。

## 学生を追加する方法

学生データは `data/students.json` で管理しています。`script.js` には直接学生データを書かず、このJSONに学生オブジェクトを追加してください。

1. 学生写真を `images/students/` に追加する
2. `data/students.json` の配列末尾に学生オブジェクトを追加する
3. `slug` は他の学生と重複しない英数字・ハイフン形式にする
4. `featured: true` にするとトップの特集学生に表示される
5. `today: true` にすると「今日話してみたい人」に優先表示される

追加例:

```json
{
  "name": "宮井陽音",
  "slug": "haruto-miyai",
  "generation": "1期生",
  "catch": "問いを立て、実装で学びを形にする",
  "image": "/images/students/haruto.jpg",
  "tags": ["教育", "AI", "デザイン", "プログラミング"],
  "talkTopics": ["教育について", "AI活用", "Web制作", "CoIU生活"],
  "currentQuestion": "どうすれば、学びの面白さが人から人へ伝わるのか",
  "currentProject": "CoIU生の問いや活動を可視化するメディアづくり",
  "oneOnOneMessage": "教育、AI、Web制作、CoIU生活について話せます。気軽に話しましょう。",
  "featured": true,
  "today": false,
  "story": "プロフィール本文をここに書きます。",
  "questions": ["今持っている問いをここに書きます"],
  "canConsult": ["相談できること"],
  "recentActivities": ["最近の活動"],
  "links": {
    "note": "",
    "youtube": "",
    "podcast": "",
    "x": "",
    "instagram": "",
    "contact": "https://forms.gle/xxxx"
  }
}
```

JSONでは末尾カンマを使えません。追加後に表示が崩れる場合は、まず `data/students.json` のカンマや引用符を確認してください。

ローカル確認は、プロジェクトルートでサーバーを起動してからブラウザで開きます。

```bash
python3 -m http.server 4173
```

ブラウザで `http://localhost:4173/` を開いて確認してください。`fetch("./data/students.json")` を使っているため、HTMLファイルを直接開くのではなくローカルサーバー経由で確認します。
