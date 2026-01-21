import os

from flask import Blueprint, render_template, jsonify, request
from .game_manager import GameManager
from .score_manager import ScoreManager

bp = Blueprint('main', __name__)
game_manager = GameManager()
score_manager = ScoreManager()

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/api/games')
def get_games():
    games = [
        {'id': 'memory-game', 'name': '🎮 神経衰弱ゲーム', 'description': 'ペアを見つけてスコアを稼ごう！'},
    ]
    return jsonify(games)

@bp.route('/api/game/drink-quiz/start', methods=['POST'])
def start_drink_quiz():
    """ゲーム開始"""
    data = request.json
    players = data.get('players', [])
    
    if not players or len(players) < 1:
        return jsonify({'error': '最低1人以上必要です'}), 400
    
    session_data = {
        'players': players,
        'current_round': 1,
        'max_rounds': 10,
        'scores': {p: 0 for p in players},
        'current_player_idx': 0,
    }
    
    return jsonify(session_data)

@bp.route('/api/game/drink-quiz/next', methods=['GET'])
def get_next_drink():
    """次のお酒を取得"""
    drink = game_manager.get_random_drink()
    return jsonify({
        'id': drink['id'],
        'image_url': f'/static/images/{drink["filename"]}',
        'difficulty': drink['difficulty']
    })

@bp.route('/api/game/drink-quiz/answer', methods=['POST'])
def submit_answer():
    """答えを提出"""
    data = request.json
    drink_id = data.get('drink_id')
    user_answer = data.get('answer')
    
    is_correct, points = game_manager.check_answer(drink_id, user_answer)
    
    # 正解情報の取得
    correct_drink = next(d for d in game_manager.get_all_drinks() if d['id'] == drink_id)
    
    return jsonify({
        'correct': is_correct,
        'correct_answer': correct_drink['name'],
        'points': points
    })

@bp.route('/api/game/drink-quiz/finish', methods=['POST'])
def finish_game():
    """ゲーム終了＆スコア保存"""
    data = request.json
    scores = data.get('scores', {})
    
    # スコアを保存
    result = score_manager.save_game_result(scores, 'drink_quiz')
    
    return jsonify({
        'success': True,
        'message': 'スコアを保存しました',
        'result': result
    })

@bp.route('/api/records')
def get_records():
    """過去の記録を取得"""
    records = score_manager.get_all_records()
    return jsonify(records)

@bp.route('/api/ranking')
def get_ranking():
    """ランキングを取得"""
    ranking = score_manager.get_ranking()
    return jsonify(ranking)

@bp.route('/api/player/<player_name>/stats')
def get_player_stats(player_name):
    """プレイヤーの統計情報を取得"""
    stats = score_manager.get_player_stats(player_name)
    return jsonify(stats)
def _canonical_image_key(filename):
    base, ext = os.path.splitext(filename)
    normalized_base = ''.join(ch for ch in base.lower() if ch.isalnum())
    normalized_ext = ext.lower()
    return f'{normalized_base}{normalized_ext}'


@bp.route('/api/game/memory-game/start', methods=['POST'])
def start_memory_game():
    """神経衰弱ゲーム開始"""
    import os
    import random
    from pathlib import Path
    
    data = request.json
    player_name = data.get('player_name', 'Unknown')
    
    if not player_name or not player_name.strip():
        return jsonify({'error': 'プレイヤー名が必要です'}), 400
    
    # static/images から jpg/jpeg/png ファイルを取得（直下のみ）
    images_dir = Path(__file__).parent.parent / 'static' / 'images'
    image_files = [f for f in os.listdir(str(images_dir)) 
                   if f.lower().endswith(('.jpg', '.jpeg', '.png')) and not f.startswith('.')]
    
    if not image_files:
        return jsonify({'error': '画像ファイルが見つかりません'}), 500
    
    # ソートして順序を統一し、拡張子・大文字差も排除してユニーク化
    image_files = sorted(image_files)
    unique_images = []
    seen_keys = set()
    for img_file in image_files:
        key = _canonical_image_key(img_file)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        unique_images.append(img_file)

    if not unique_images:
        return jsonify({'error': '有効な画像がありません'}), 500

    random.shuffle(unique_images)
    target_pairs = 8
    selected_images = unique_images[:min(len(unique_images), target_pairs)]

    # 足りない分は再利用（重複しないよう順番はランダム）
    idx = 0
    while len(selected_images) < target_pairs:
        selected_images.append(unique_images[idx % len(unique_images)])
        idx += 1

    cards = []
    pair_id = 0

    for idx, img_file in enumerate(selected_images):
        for copy in range(2):  # 各画像を2枚使って1ペア
            cards.append({
                'id': f'card_{pair_id}',
                'image': img_file,
                'pair_id': idx
            })
            pair_id += 1
    
    # シャッフル
    random.shuffle(cards)
    
    session_data = {
        'player_name': player_name,
        'cards': cards,
        'score': 0,
        'attempts': 0,
        'mistakes': 0,
        'matched': [],
        'game_over': False,
        'game_type': 'memory_game'
    }
    
    return jsonify(session_data)

@bp.route('/api/game/memory-game/check-match', methods=['POST'])
def check_memory_match():
    """神経衰弱: 2つのカードが一致するか確認"""
    data = request.json
    card1_id = data.get('card1_id')
    card2_id = data.get('card2_id')
    card1_pair = data.get('card1_pair')
    card2_pair = data.get('card2_pair')
    card1_image = data.get('card1_image')
    card2_image = data.get('card2_image')
    
    is_match = False
    if card1_image and card2_image:
        is_match = card1_image == card2_image
    else:
        is_match = card1_pair == card2_pair
    points = 10 if is_match else 0
    
    return jsonify({
        'match': is_match,
        'points': points
    })

@bp.route('/api/game/memory-game/finish', methods=['POST'])
def finish_memory_game():
    """神経衰弱 ゲーム終了"""
    data = request.json
    player_name = data.get('player_name', '')
    pairs_matched = data.get('pairs_matched', 0)
    special_bonus = data.get('special_bonus', 0)
    
    # スコアを計算（ペア数×10＋特別ボーナス）
    final_score = max(0, pairs_matched * 10 + special_bonus)
    
    result = score_manager.save_game_result(
        {player_name: final_score},
        'memory_game'
    )
    
    return jsonify({
        'success': True,
        'final_score': final_score,
        'message': f'{player_name}: {final_score}点',
        'result': result
    })
