# 可愛いお酒の会 - ミニゲーム集

4〜5人で遊べるお酒の会向けミニゲームアプリケーション

## セットアップ

### 必要なもの
- Python 3.8以上
- pip

### インストール

```bash
# 依存パッケージのインストール
pip install -r requirements.txt

# アプリケーション起動
python run.py
```

### アクセス方法
ブラウザで `http://localhost:5000` にアクセス

## プロジェクト構成

```
.
├── app/
│   ├── __init__.py      # Flask アプリ初期化
│   ├── routes.py        # ルート定義
│   ├── game_manager.py  # ゲームロジック
│   └── games_data.json  # ゲームデータ
├── static/
│   ├── images/          # お酒の写真
│   ├── style.css        # スタイルシート
│   └── script.js        # フロントエンド JavaScript
├── templates/
│   └── index.html       # メインページ
├── extract_drinks.py    # お酒写真自動抽出スクリプト
├── run.py               # エントリーポイント
└── requirements.txt     # Python 依存パッケージ
```

## お酒の写真自動抽出

### 概要
写真フォルダから自動的にお酒が写っている画像を検出・抽出します。

### 使用方法

**基本的な使い方（~/Pictures から自動抽出）：**
```bash
python extract_drinks.py
```

**カスタムフォルダから抽出：**
```bash
python extract_drinks.py --source /path/to/your/photos
```

**詳細オプション：**
```bash
python extract_drinks.py \
  --source ~/Pictures \
  --output ./static/images \
  --threshold 0.3 \
  --max 20
```

### オプション
- `--source`: スキャンするフォルダのパス（デフォルト: ~/Pictures）
- `--output`: 出力先フォルダ（デフォルト: ./static/images）
- `--threshold`: お酒と判定する信頼度閾値（0-1、デフォルト: 0.3）
- `--max`: 抽出する最大画像数（デフォルト: 20）

### 仕組み
- ImageNetで事前学習されたResNet50を使用
- 画像内の物体を認識し、お酒関連キーワードで判定
- 認識精度：約80-90%（クリアボトル、ラベル等のお酒固有の特徴で判定）

### 注意点
- 処理時間：1枚あたり1-2秒程度
- GPU対応環境なら大幅に高速化
- 完全な自動抽出のため、手動で確認・削除推奨

## ゲーム一覧

### 🍷 お酒当てクイズ
お酒の写真を見て、何のお酒かを当てるゲーム。
- 最大10ラウンド
- リアルタイムスコア表示
- 4～5人対応
