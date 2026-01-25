# 可愛いお酒の会 - ミニゲーム集

4〜5人で遊べる、お酒の会のための Flask ベースのミニゲーム集です。

## セットアップ

### 必要なもの
- Python 3.8 以上
- pip

### インストールと起動（ローカル）

```bash
# 依存パッケージのインストール
python3 -m pip install -r requirements.txt

# アプリケーション起動
python3 run.py
```

### アクセス方法
ブラウザで `http://localhost:5000` にアクセスしてください。

## プロジェクト構成

```
.
├── app/
│   ├── __init__.py      # Flask アプリ初期化
│   ├── routes.py        # ルート定義（ゲーム一覧＋API）
│   ├── game_manager.py  # ゲームロジック
│   ├── games_data.json  # お酒データ
│   └── data/
│       └── scores.json  # スコア記録（ScoreManager が書き込む）
├── static/
│   ├── assets/
│   │   ├── css/
│   │   │   └── shared.css        # ゲーム共通スタイル
│   │   └── js/
│   │       ├── memory.js         # 神経衰弱用スクリプト
│   │       └── mansion.js        # 松本屋敷用スクリプト
│   └── images/                   # ゲーム用画像（お酒＋松本）
├── templates/
│   └── games/
│       ├── list.html            # ゲーム一覧ページ
│       ├── memory/
│       │   └── index.html       # 神経衰弱ページ
│       └── mansion/
│           └── index.html       # 松本屋敷ページ
├── run.py                        # エントリーポイント（`app` 変数を公開）
└── requirements.txt              # Python 依存パッケージ
```

## お酒の写真自動抽出（任意機能）

### 概要
指定フォルダの画像から「お酒らしさ」を持つ写真を抽出する補助ツールです。

### 注意（重要）
- 個人の写真フォルダを走査するため、実行前に対象フォルダとアクセス権限を必ず確認してください。
- 抽出結果には誤判定が含まれる可能性が高いため、すべて手動で確認・削除したうえで利用してください。
- モデルの精度や挙動は環境・写真の条件に左右されやすく、未検証の数値は記載していません。

### 使用方法

```bash
python extract_drinks.py
python extract_drinks.py --source /path/to/your/photos
python extract_drinks.py \
  --source ~/Pictures \
  --output ./static/images \
  --threshold 0.3 \
  --max 20
```

### オプション
- `--source`: スキャンするフォルダのパス（デフォルト: ~/Pictures）
- `--output`: 出力先フォルダ（デフォルト: ./static/images）
- `--threshold`: 判定の閾値（0-1、デフォルト: 0.3）
- `--max`: 抽出する最大画像数（デフォルト: 20）

## GitHub への push 手順（事故リスクを下げるバージョン）

1. `git status` で差分を確認し、意図しないファイルが混ざっていないかを把握。
2. 必要なファイルだけをステージング（例: `git add README.md templates/ static/assets/` あるいは `git add -p`）。
3. `git diff --cached` でステージ済み差分を確認。
4. `git commit -m "Reorganize shared assets"` のような説明的なメッセージでコミット。
5. `git push origin mansion-redesign`（ブランチ名は作業中のもの）でリモートに送る。

## Render へのデプロイ（WSGI 設定を再確認）

1. GitHub と Render を連携して Web Service を作成。
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `gunicorn run:app`
   - `run.py` ではモジュールスコープで `app = create_app()` を公開しているため、このコマンドで動作します。
   - `create_app()` を直接呼び出す構成に変えた場合は `gunicorn app:create_app()` などに調整してください。
4. 環境変数 `FLASK_SECRET` を設定してセッション署名を保護（`app/__init__.py` 参照）。
5. デプロイ後、ブラウザの DevTools で `/static/assets/...` へ 404 が出ていないかを確認。

## ゲーム一覧

### 🍷 お酒当てクイズ
お酒の写真を見て、「何のお酒か？」を当てるゲーム。
- 最大10ラウンド
- リアルタイムスコア表示
- 4〜5人対応

### 🎭 松本版８番出口〜松本家への招待〜
Matsumoto Mansion シリーズの迷路風イベント。
- 正解の写真と違和感のある写真を見分けて左／右の扉を選ぶ
- ミス3回でゲームオーバー（松本が怒る）
- サーバー側で状態を保持するため、視覚的には写真だけが変化します
