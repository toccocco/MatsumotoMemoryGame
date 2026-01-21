import json
import os
from pathlib import Path

class GameManager:
    def __init__(self):
        self.data_file = Path(__file__).parent / 'games_data.json'
        self.drinks = self._load_drinks()
    
    def _load_drinks(self):
        """お酒データを読み込み"""
        with open(self.data_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def get_random_drink(self, exclude_ids=None):
        """ランダムなお酒を取得"""
        import random
        exclude_ids = exclude_ids or []
        available = [d for d in self.drinks if d['id'] not in exclude_ids]
        if available:
            return random.choice(available)
        return None
    
    def get_all_drinks(self):
        """すべてのお酒を取得"""
        return self.drinks
    
    def check_answer(self, drink_id, user_answer):
        """答えが正しいかチェック"""
        drink = next((d for d in self.drinks if d['id'] == drink_id), None)
        if not drink:
            return False, 0
        
        correct_answer = drink['name'].lower()
        user_answer_clean = user_answer.lower().strip()
        
        # 完全一致
        if correct_answer == user_answer_clean:
            return True, 100
        
        # 部分一致（緩い判定）
        if correct_answer in user_answer_clean or user_answer_clean in correct_answer:
            return True, 50
        
        return False, 0
