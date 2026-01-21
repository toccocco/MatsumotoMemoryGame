let gameState = null;
let playerName = '';
let memoryGameState = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-game-btn')?.addEventListener('click', () => startGame());
    document.getElementById('reset-game-btn')?.addEventListener('click', () => resetGameInProgress());
    document.getElementById('restart-btn')?.addEventListener('click', () => restartFromResults());
    document.getElementById('return-btn')?.addEventListener('click', () => resetToStart());

    document.getElementById('player-name-input')?.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            startGame();
        }
    });
    toggleResetButton(true);
});

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId)?.classList.remove('hidden');
}

async function startGame(overrideName) {
    const input = document.getElementById('player-name-input');
    const nameCandidate = overrideName?.trim() || input?.value.trim() || '';

    if (!nameCandidate) {
        alert('名前を入力してください');
        return;
    }

    playerName = nameCandidate;
    input.value = playerName;
    setStatus('ゲームを準備中...');

    try {
        const response = await fetch('/api/game/memory-game/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_name: playerName })
        });

        if (!response.ok) {
            throw new Error('サーバーエラー');
        }

        gameState = await response.json();
        const invalidCards = validateCards(gameState.cards);
        let startStatus = undefined;
        if (invalidCards.length > 0) {
            const labels = invalidCards
                .map(([img, count]) => `${img} (枚数=${count})`)
                .join(', ');
            console.warn('不正なカード構成:', labels);
            const proceed = window.confirm(
                'カード構成に重複または欠落があります。続行しますか？\n\n'
                + labels
            );
            if (!proceed) {
                setStatus('カード構成が不正なため開始を中止しました。');
                return;
            }
            startStatus = 'カード構成に不備がありますが、続行します。';
        }
        initMemoryGame(startStatus);
        showScreen('game-screen');
    } catch (error) {
        console.error('ゲーム開始エラー:', error);
        alert('ゲームの開始に失敗しました。再度お試しください。');
        setStatus('通信エラーが発生しました。');
    }
}

function validateCards(cards) {
    if (!Array.isArray(cards)) {
        return [];
    }

    const countByImage = {};
    cards.forEach(card => {
        if (!card || !card.image) {
            return;
        }
        const key = card.image;
        countByImage[key] = (countByImage[key] || 0) + 1;
    });

    return Object.entries(countByImage).filter(([, count]) => count !== 2);
}

function initMemoryGame(statusMessage = 'カードをめくってペアを見つけよう！') {
    memoryGameState = {
        flipped: [],
        matched: [],
        locked: false,
        attempts: 0,
        mistakes: 0,
        score: 0,
        pairsMatched: 0,
        specialBonus: 0
    };

    recalcScore();
    renderMemoryBoard();
    updateMemoryDisplay();
    setStatus(statusMessage);
    toggleResetButton(false);
}

function renderMemoryBoard() {
    const board = document.getElementById('memory-board');
    if (!board || !gameState) {
        return;
    }

    board.innerHTML = '';
    board.style.gridTemplateColumns = 'repeat(4, 1fr)';

    gameState.cards.forEach((card, idx) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'memory-card';
        cardEl.dataset.idx = idx;

        if (memoryGameState.matched.includes(idx)) {
            cardEl.classList.add('matched');
            cardEl.innerHTML = `<img src="/static/images/${card.image}" alt="photo">`;
        } else if (memoryGameState.flipped.includes(idx)) {
            cardEl.classList.add('flipped');
            cardEl.innerHTML = `<img src="/static/images/${card.image}" alt="photo">`;
        } else {
            cardEl.textContent = '🎴';
        }

        cardEl.addEventListener('click', () => flipCard(idx));
        board.appendChild(cardEl);
    });
}

function shuffleDeck() {
    if (!gameState || !Array.isArray(gameState.cards)) {
        return;
    }

    for (let i = gameState.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.cards[i], gameState.cards[j]] = [gameState.cards[j], gameState.cards[i]];
    }
}

function flipCard(idx) {
    if (!memoryGameState || memoryGameState.locked) {
        return;
    }

    if (memoryGameState.matched.includes(idx) || memoryGameState.flipped.includes(idx)) {
        return;
    }

    if (memoryGameState.flipped.length >= 2) {
        return;
    }

    memoryGameState.flipped.push(idx);
    renderMemoryBoard();

    if (memoryGameState.flipped.length === 2) {
        checkMemoryMatch();
    }
}

async function checkMemoryMatch() {
    memoryGameState.locked = true;
    memoryGameState.attempts++;

    const [idx1, idx2] = memoryGameState.flipped;
    const card1 = gameState.cards[idx1];
    const card2 = gameState.cards[idx2];

    setStatus('カードを確認中...');

    await waitForCardImageLoad(idx1);
    await waitForCardImageLoad(idx2);
    await delay(250);

    try {
        const response = await fetch('/api/game/memory-game/check-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                card1_id: card1.id,
                card2_id: card2.id,
                card1_pair: card1.pair_id,
                card2_pair: card2.pair_id,
                card1_image: card1.image,
                card2_image: card2.image
            })
        });

        const result = await response.json();

        if (result.match) {
            memoryGameState.pairsMatched += 1;
            if (
                memoryGameState.specialBonus === 0 &&
                (card1.image === 'IMG_0000.jpeg' || card2.image === 'IMG_0000.jpeg')
            ) {
                memoryGameState.specialBonus = 30;
            }
            recalcScore();
            memoryGameState.matched.push(idx1, idx2);
            memoryGameState.flipped = [];
            memoryGameState.locked = false;
            setStatus('マッチ！よくできました！');
        } else {
            memoryGameState.mistakes++;
            setStatus('残念！もう一度挑戦してみよう！');
            await new Promise(resolve => setTimeout(resolve, 600));
            memoryGameState.flipped = [];
            memoryGameState.locked = false;
            recalcScore();
        }

        renderMemoryBoard();
        updateMemoryDisplay();

        if (memoryGameState.mistakes >= 3) {
            setStatus('ミスが3回に達したのでゲームオーバーです。');
            await endMemoryGame();
            return;
        }

        if (memoryGameState.matched.length === gameState.cards.length) {
            await endMemoryGame();
        }
    } catch (error) {
        console.error('マッチ確認エラー:', error);
        memoryGameState.locked = false;
        setStatus('通信エラーが発生しました。');
    }
}

function updateMemoryDisplay() {
    const attemptsEl = document.getElementById('memory-info');
    if (attemptsEl) {
        attemptsEl.textContent = `試行: ${memoryGameState.attempts} | ミス: ${memoryGameState.mistakes}/3`;
    }

    const scoreEl = document.getElementById('current-score');
    if (scoreEl) {
        scoreEl.textContent = memoryGameState.score;
    }
}

function recalcScore() {
    if (!memoryGameState) {
        return;
    }
    memoryGameState.score = memoryGameState.pairsMatched * 10 + memoryGameState.specialBonus;
}

function setStatus(message) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

async function endMemoryGame() {
    setStatus('スコアを保存しています...');

    try {
        const response = await fetch('/api/game/memory-game/finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_name: playerName,
                score: memoryGameState.score,
                attempts: memoryGameState.attempts,
                mistakes: memoryGameState.mistakes,
                pairs_matched: memoryGameState.pairsMatched,
                special_bonus: memoryGameState.specialBonus
            })
        });

        await response.json();
    } catch (error) {
        console.error('スコア保存エラー:', error);
    }

    displayFinalScores();
    await loadTodayRanking();
    showScreen('result-screen');
}

function displayFinalScores() {
    const container = document.getElementById('final-scores-content');
    if (!container) {
        return;
    }

    const html = `
        <div class="final-score-item">
            <span class="rank">🏆</span>
            <span>${playerName}</span>
            <span><strong>${memoryGameState.score}</strong>点</span>
        </div>
        <div class="final-score-detail">
            <p>試行: ${memoryGameState.attempts}</p>
            <p>ミス: ${memoryGameState.mistakes}</p>
        </div>
    `;

    container.innerHTML = html;
}

function resetToStart() {
    playerName = '';
    gameState = null;
    memoryGameState = null;
    document.getElementById('player-name-input').value = '';
    setStatus('');
    const rankingEl = document.getElementById('ranking-content');
    if (rankingEl) {
        rankingEl.innerHTML = '';
    }
    showScreen('start-screen');
    toggleResetButton(true);
}

function resetGameInProgress() {
    if (!playerName || !gameState) {
        return;
    }

    setStatus('現在のゲームが進行中なので、リセットはできません。');
}

function restartFromResults() {
    if (!playerName || !gameState) {
        resetToStart();
        return;
    }

    setStatus('リスタートしています...');
    shuffleDeck();
    initMemoryGame();
    showScreen('game-screen');
    toggleResetButton(false);
}

async function loadTodayRanking() {
    const container = document.getElementById('ranking-content');
    if (!container) {
        return;
    }

    container.innerHTML = '<p>ランキングを読み込み中...</p>';

    try {
        const response = await fetch('/api/ranking');
        if (!response.ok) {
            throw new Error('ランキング取得失敗');
        }

        const ranking = await response.json();
        renderRankingList(ranking);
    } catch (error) {
        console.error('ランキング取得エラー:', error);
        container.innerHTML = '<p>ランキングの読み込みに失敗しました。</p>';
    }
}

function renderRankingList(ranking) {
    const container = document.getElementById('ranking-content');
    if (!container) {
        return;
    }

    if (!ranking || ranking.length === 0) {
        container.innerHTML = '<p>本日の記録がまだありません。</p>';
        return;
    }

    const items = ranking.map(entry => `
        <div class="ranking-item">
            <span class="rank">${entry.rank}</span>
            <span class="player-name">${entry.name}</span>
            <span class="stat">
                <span class="stat-label">スコア</span>
                <span class="stat-value">${entry.score}</span>
            </span>
        </div>
    `);

    container.innerHTML = items.join('');
}
function toggleResetButton(enable) {
    const btn = document.getElementById('reset-game-btn');
    if (!btn) return;
    btn.disabled = !enable;
    if (!enable) {
        btn.setAttribute('title', '現在のゲーム中はリセットできません');
    } else {
        btn.setAttribute('title', '');
    }
}

function waitForCardImageLoad(cardIndex) {
    return new Promise(resolve => {
        const img = document.querySelector(`.memory-card[data-idx="${cardIndex}"] img`);
        if (!img) {
            resolve();
            return;
        }

        if (img.complete) {
            resolve();
            return;
        }

        const done = () => {
            img.removeEventListener('load', done);
            img.removeEventListener('error', done);
            resolve();
        };

        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
