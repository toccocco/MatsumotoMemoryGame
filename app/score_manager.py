"""
プレイヤースコア記録管理
"""

import json
import os
from pathlib import Path
from datetime import datetime, timedelta

class ScoreManager:
    def __init__(self, data_dir='./app/data'):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.scores_file = self.data_dir / 'scores.json'
        self._ensure_file_exists()
    
    def _ensure_file_exists(self):
        """スコアファイルがなければ初期化"""
        if not self.scores_file.exists():
            with open(self.scores_file, 'w', encoding='utf-8') as f:
                json.dump([], f)
    
    def _cleanup_old_records(self):
        """1週間以上前の記録を削除"""
        with open(self.scores_file, 'r', encoding='utf-8') as f:
            records = json.load(f)
        
        cutoff_date = (datetime.now() - timedelta(days=7)).date()
        filtered_records = []
        
        for record in records:
            try:
                record_date = datetime.fromisoformat(record['timestamp']).date()
                if record_date >= cutoff_date:
                    filtered_records.append(record)
            except:
                filtered_records.append(record)  # パースできないものは保持
        
        with open(self.scores_file, 'w', encoding='utf-8') as f:
            json.dump(filtered_records, f, indent=2, ensure_ascii=False)
        
        return filtered_records
    
    def save_game_result(self, players_scores, game_type='memory_game'):
        """
        ゲーム結果を保存
        
        Args:
            players_scores: {'プレイヤー名': スコア} のdict
            game_type: ゲームタイプ
        """
        # 古いレコードをクリーンアップ
        self._cleanup_old_records()
        
        with open(self.scores_file, 'r', encoding='utf-8') as f:
            records = json.load(f)
        
        # 新しい記録を追加
        now = datetime.now()
        new_record = {
            'timestamp': now.isoformat(),
            'date': now.strftime('%Y-%m-%d'),
            'game_type': game_type,
            'players': list(players_scores.keys()),
            'scores': players_scores,
            'winner': max(players_scores, key=players_scores.get) if players_scores else None
        }
        
        records.append(new_record)
        
        with open(self.scores_file, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        
        return new_record
    
    def get_today_ranking(self):
        """本日のランキングを取得（スコアの高い順）"""
        from datetime import datetime
        
        with open(self.scores_file, 'r', encoding='utf-8') as f:
            records = json.load(f)
        
        # 今日のレコードのみ抽出
        today = datetime.now().strftime('%Y-%m-%d')
        today_records = [r for r in records if r.get('date') == today]
        
        # プレイヤーごとの最高スコアを収集
        player_scores = {}
        for record in today_records:
            for player, score in record.get('scores', {}).items():
                if player not in player_scores:
                    player_scores[player] = score
                else:
                    player_scores[player] = max(player_scores[player], score)
        
        # スコアでソート
        ranking = sorted(player_scores.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {
                'rank': idx + 1,
                'name': name,
                'score': score
            }
            for idx, (name, score) in enumerate(ranking)
        ]
    
    def get_all_records(self):
        """すべての記録を取得"""
        with open(self.scores_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def get_player_stats(self, player_name):
        """プレイヤーの統計情報を取得"""
        with open(self.scores_file, 'r', encoding='utf-8') as f:
            records = json.load(f)
        
        player_records = [r for r in records if player_name in r.get('players', [])]
        
        if not player_records:
            return {
                'player_name': player_name,
                'total_games': 0,
                'total_wins': 0,
                'total_points': 0,
                'average_points': 0
            }
        
        total_points = sum(r['scores'].get(player_name, 0) for r in player_records)
        total_wins = sum(1 for r in player_records if r['winner'] == player_name)
        
        return {
            'player_name': player_name,
            'total_games': len(player_records),
            'total_wins': total_wins,
            'total_points': total_points,
            'average_points': total_points / len(player_records) if player_records else 0
        }
    
    def get_ranking(self):
        """本日のランキングを取得（互換性のため）"""
        return self.get_today_ranking()
        
        player_stats = {}
        
        for record in records:
            for player in record.get('players', []):
                if player not in player_stats:
                    player_stats[player] = {
                        'total_games': 0,
                        'total_wins': 0,
                        'total_points': 0
                    }
                
                player_stats[player]['total_games'] += 1
                player_stats[player]['total_points'] += record['scores'].get(player, 0)
                if record['winner'] == player:
                    player_stats[player]['total_wins'] += 1
        
        # ランキングを作成（獲得ポイント順）
        ranking = sorted(
            [{'name': name, **stats} for name, stats in player_stats.items()],
            key=lambda x: x['total_points'],
            reverse=True
        )
        
        return ranking
