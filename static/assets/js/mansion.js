const overlay = document.getElementById('anomaly-overlay');
const lineText = document.getElementById('line-text');
const cupCounter = document.getElementById('cup-counter');
const strikeCounter = document.getElementById('strike-counter');
const statusMessage = document.getElementById('status-message');
const glassTriggers = Array.from(document.querySelectorAll('.glass-trigger'));
const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const flashOverlay = document.getElementById('flash-overlay');
const debugPanel = document.getElementById('debug-panel');
const debugTurn = document.getElementById('debug-turn');
const debugAnomaly = document.getElementById('debug-anomaly');
const debugType = document.getElementById('debug-type');
const debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
const backToStartButton = document.getElementById('back-to-start');
const backHomeUrl = backToStartButton?.dataset.homeUrl;

let cupsTotal = 8;
let finalLineTimeout = null;

function setStatusMessage(text) {
    statusMessage.textContent = text;
}

function updateOverlay(type) {
    overlay.className = `mansion-overlay ${type || 'overlay-soft-warm'}`;
}

function updateLine(text, { final = false } = {}) {
    lineText.textContent = text;
    lineText.classList.toggle('final-line', final);
}

function updateCounters(drinkCount, strikes) {
    cupCounter.textContent = `${Math.min(drinkCount, cupsTotal)} / ${cupsTotal}`;
    strikeCounter.textContent = `${strikes} / 3`;
}

function setInteractions(enabled) {
    glassTriggers.forEach(glass => {
        glass.classList.toggle('disabled', !enabled);
    });
}

function updateDebugInfo(data) {
    if (!debugMode || !debugPanel) {
        return;
    }
    debugPanel.classList.remove('hidden');
    if (debugTurn) {
        debugTurn.textContent = data.drink_count;
    }
    if (debugAnomaly) {
        debugAnomaly.textContent = data.has_anomaly ? 'ON' : 'OFF';
    }
    if (debugType) {
        debugType.textContent = data.anomaly_type || '-';
    }
}

function highlightAnomalyGlass(hasAnomaly) {
    const correctDir = hasAnomaly ? 'right' : 'left';
    glassTriggers.forEach(glass => {
        glass.classList.toggle('anomaly', glass.dataset.direction === correctDir);
    });
}

function triggerGameOverFlash() {
    if (!flashOverlay) {
        return;
    }
    flashOverlay.classList.remove('hidden');
    flashOverlay.classList.add('active');
    setTimeout(() => {
        flashOverlay.classList.add('hidden');
        flashOverlay.classList.remove('active');
    }, 300);
}

function triggerTimeGlitch() {
    if (!overlay) {
        return;
    }

    overlay.classList.add('overlay-time-glitch');
    setTimeout(() => {
        overlay.classList.remove('overlay-time-glitch');
    }, 160);
}

function scheduleFinalLine() {
    if (finalLineTimeout) {
        clearTimeout(finalLineTimeout);
    }
    finalLineTimeout = setTimeout(() => {
        updateLine('……ええ時間やったな', { final: true });
    }, 900);
}

async function startGame() {
    setStatusMessage('松本とのはなしを始めよう…');
    gameOverOverlay.classList.add('hidden');
    if (flashOverlay) {
        flashOverlay.classList.add('hidden');
        flashOverlay.classList.remove('active');
    }
    try {
        const response = await fetch('/api/mansion/start', {
            method: 'POST'
        });
        const data = await response.json();
        const interactive = handleUpdate(data);
        startOverlay.classList.add('hidden');
        setInteractions(interactive);
    } catch (error) {
        console.error(error);
        setStatusMessage('通信に失敗しました。リロードして再試行してください。');
    }
}

async function chooseGlass(direction) {
    setInteractions(false);
    setStatusMessage('選択を確認中…');
    try {
        const res = await fetch('/api/mansion/choose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ direction })
        });
        const data = await res.json();
        const interactive = handleUpdate(data);
        setInteractions(interactive);
        triggerTimeGlitch();
    } catch (error) {
        console.error(error);
        setStatusMessage('通信に失敗しました。もう一度選んでください。');
        setInteractions(true);
    }
}

function handleUpdate(data) {
    cupsTotal = data.cups_total || cupsTotal;
    updateCounters(data.drink_count, data.strike_count);
    updateLine(data.line || '...');
    updateOverlay(data.anomaly_type);
    highlightAnomalyGlass(data.has_anomaly);
    updateDebugInfo(data);

    if (finalLineTimeout && !data.cleared) {
        clearTimeout(finalLineTimeout);
        finalLineTimeout = null;
    }

    if (data.game_over) {
        setStatusMessage('……あれ？ 松本が怒ってる気がする。');
        gameOverOverlay.classList.remove('hidden');
        triggerGameOverFlash();
        return false;
    }

    if (data.cleared) {
        setStatusMessage('全部見抜いた。乾杯しよう。');
        scheduleFinalLine();
        return false;
    }

    setStatusMessage('もう一杯、ゆっくり飲んで確認。');
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    glassTriggers.forEach(glass => {
        glass.addEventListener('click', () => {
            const dir = glass.dataset.direction;
            chooseGlass(dir);
        });
    });

    document.getElementById('start-game-btn').addEventListener('click', () => {
        startGame();
    });

    backToStartButton?.addEventListener('click', () => {
        if (backHomeUrl) {
            window.location.href = backHomeUrl;
            return;
        }
        window.location.reload();
    });

    if (debugMode && debugPanel) {
        debugPanel.classList.remove('hidden');
    }

    setInteractions(false);
});
