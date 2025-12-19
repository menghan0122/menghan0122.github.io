// ===== 遊戲常數與狀態 =====
const SIZE = 8;
const EMPTY = 0;
const BLACK = 1;  // 玩家
const WHITE = 2;  // 電腦

// 八個方向
const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

// 遊戲狀態
let board = [];
let currentPlayer = BLACK;
let difficulty = 'basic'; // 'basic' 或 'advanced'
let gameActive = true;
let isAnimating = false;

// DOM 元素
const boardEl = document.getElementById('board');
const blackScoreEl = document.getElementById('blackScore');
const whiteScoreEl = document.getElementById('whiteScore');
const turnIndicatorEl = document.getElementById('turnIndicator');
const statusMessageEl = document.getElementById('statusMessage');
const restartBtn = document.getElementById('restartBtn');
const difficultySelect = document.getElementById('difficulty');
const gameOverModal = document.getElementById('gameOverModal');
const modalResult = document.getElementById('modalResult');
const modalBlackScore = document.getElementById('modalBlackScore');
const modalWhiteScore = document.getElementById('modalWhiteScore');
const modalRestartBtn = document.getElementById('modalRestartBtn');

// ===== 初始化遊戲 =====
function initGame() {
    // 建立空棋盤
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    
    // 放置初始四顆棋子
    const mid = SIZE / 2;
    board[mid - 1][mid - 1] = WHITE;
    board[mid][mid] = WHITE;
    board[mid - 1][mid] = BLACK;
    board[mid][mid - 1] = BLACK;
    
    // 重置遊戲狀態
    currentPlayer = BLACK;
    gameActive = true;
    isAnimating = false;
    difficulty = difficultySelect.value;
    
    // 隱藏對話框
    gameOverModal.classList.remove('show');
    
    // 清空狀態訊息
    statusMessageEl.textContent = '';
    
    // 渲染棋盤
    renderBoard();
    updateScores();
    updateTurnIndicator();
}

// ===== 檢查座標是否在棋盤內 =====
function isInBounds(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

// ===== 取得某一位置在某個方向上可以翻轉的棋子 =====
function getFlipsInDirection(row, col, player, direction) {
    const opponent = player === BLACK ? WHITE : BLACK;
    const flips = [];
    let r = row + direction[0];
    let c = col + direction[1];
    
    // 沿著方向前進，收集對手的棋子
    while (isInBounds(r, c) && board[r][c] === opponent) {
        flips.push([r, c]);
        r += direction[0];
        c += direction[1];
    }
    
    // 如果最後遇到自己的棋子，這些翻轉才有效
    if (flips.length > 0 && isInBounds(r, c) && board[r][c] === player) {
        return flips;
    }
    
    return [];
}

// ===== 取得某一位置所有可翻轉的棋子 =====
function getAllFlips(row, col, player) {
    if (board[row][col] !== EMPTY) {
        return [];
    }
    
    const allFlips = [];
    for (const direction of DIRECTIONS) {
        const flips = getFlipsInDirection(row, col, player, direction);
        allFlips.push(...flips);
    }
    
    return allFlips;
}

// ===== 取得所有合法移動 =====
function getValidMoves(player) {
    const validMoves = [];
    
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const flips = getAllFlips(row, col, player);
            if (flips.length > 0) {
                validMoves.push({ row, col, flips });
            }
        }
    }
    
    return validMoves;
}

// ===== 放置棋子 =====
async function placeDisc(row, col, player) {
    const flips = getAllFlips(row, col, player);
    
    if (flips.length === 0) {
        return false;
    }
    
    isAnimating = true;
    
    // 放置新棋子
    board[row][col] = player;
    
    // 渲染新棋子並加入動畫
    const cell = getCellElement(row, col);
    const disc = createDisc(player);
    disc.classList.add('placing');
    cell.innerHTML = '';
    cell.appendChild(disc);
    
    // 等待放置動畫
    await sleep(500);
    
    // 依序翻轉棋子
    for (const [flipRow, flipCol] of flips) {
        await flipDisc(flipRow, flipCol, player);
        await sleep(80); // 每個翻轉之間的延遲
    }
    
    isAnimating = false;
    return true;
}

// ===== 翻轉棋子動畫 =====
async function flipDisc(row, col, toPlayer) {
    board[row][col] = toPlayer;
    const cell = getCellElement(row, col);
    const disc = cell.querySelector('.disc');
    
    if (disc) {
        disc.classList.add('flipping');
        
        // 在動畫中途改變顏色
        await sleep(300);
        disc.className = 'disc flipping';
        disc.classList.add(toPlayer === BLACK ? 'disc-black' : 'disc-white');
        
        await sleep(300);
        disc.classList.remove('flipping');
    }
}

// ===== 取得格子 DOM 元素 =====
function getCellElement(row, col) {
    return boardEl.children[row * SIZE + col];
}

// ===== 建立棋子元素 =====
function createDisc(player) {
    const disc = document.createElement('div');
    disc.className = 'disc';
    disc.classList.add(player === BLACK ? 'disc-black' : 'disc-white');
    return disc;
}

// ===== 渲染棋盤 =====
function renderBoard() {
    boardEl.innerHTML = '';
    const validMoves = gameActive && currentPlayer === BLACK ? getValidMoves(currentPlayer) : [];
    
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // 如果有棋子，顯示棋子
            if (board[row][col] !== EMPTY) {
                const disc = createDisc(board[row][col]);
                cell.appendChild(disc);
            }
            
            // 如果是合法移動位置，加上標記和點擊事件
            const validMove = validMoves.find(m => m.row === row && m.col === col);
            if (validMove) {
                cell.classList.add('valid-move');
                
                // 顯示可翻轉數量
                const flipCount = document.createElement('div');
                flipCount.className = 'flip-count';
                flipCount.textContent = validMove.flips.length;
                cell.appendChild(flipCount);
                
                // 加入點擊事件
                cell.addEventListener('click', () => handleCellClick(row, col));
            }
            
            boardEl.appendChild(cell);
        }
    }
}

// ===== 處理玩家點擊 =====
async function handleCellClick(row, col) {
    if (!gameActive || isAnimating || currentPlayer !== BLACK) {
        return;
    }
    
    const success = await placeDisc(row, col, BLACK);
    
    if (success) {
        updateScores();
        await sleep(200);
        
        // 切換到電腦回合
        currentPlayer = WHITE;
        updateTurnIndicator();
        
        // 檢查遊戲是否結束
        if (!checkGameEnd()) {
            // 電腦思考一下再下棋
            statusMessageEl.textContent = '電腦思考中...';
            await sleep(800);
            await computerMove();
        }
    }
}

// ===== 電腦移動 =====
async function computerMove() {
    if (!gameActive || isAnimating) {
        return;
    }
    
    const validMoves = getValidMoves(WHITE);
    
    if (validMoves.length === 0) {
        // 電腦無子可下，跳過
        statusMessageEl.textContent = '電腦無子可下，跳過回合';
        await sleep(1500);
        currentPlayer = BLACK;
        updateTurnIndicator();
        
        // 檢查玩家是否也無子可下
        if (getValidMoves(BLACK).length === 0) {
            endGame();
        } else {
            statusMessageEl.textContent = '';
            renderBoard();
        }
        return;
    }
    
    // 根據難度選擇移動
    let selectedMove;
    if (difficulty === 'advanced') {
        selectedMove = getAdvancedMove(validMoves);
    } else {
        selectedMove = getBasicMove(validMoves);
    }
    
    statusMessageEl.textContent = '';
    await placeDisc(selectedMove.row, selectedMove.col, WHITE);
    updateScores();
    await sleep(200);
    
    // 切換回玩家回合
    currentPlayer = BLACK;
    updateTurnIndicator();
    
    // 檢查遊戲是否結束
    if (!checkGameEnd()) {
        // 檢查玩家是否有子可下
        if (getValidMoves(BLACK).length === 0) {
            statusMessageEl.textContent = '玩家無子可下，跳過回合';
            await sleep(1500);
            currentPlayer = WHITE;
            updateTurnIndicator();
            
            // 如果電腦也沒有，遊戲結束
            if (getValidMoves(WHITE).length === 0) {
                endGame();
            } else {
                await computerMove();
            }
        } else {
            renderBoard();
        }
    }
}

// ===== 基本棋力：選擇翻轉最多的位置 =====
function getBasicMove(validMoves) {
    let bestMove = validMoves[0];
    let maxFlips = bestMove.flips.length;
    
    for (const move of validMoves) {
        if (move.flips.length > maxFlips) {
            maxFlips = move.flips.length;
            bestMove = move;
        }
    }
    
    return bestMove;
}

// ===== 進階棋力：考慮位置權重和策略 =====
function getAdvancedMove(validMoves) {
    // 位置權重矩陣（角落最重要，邊次之）
    const weights = [
        [100, -20, 10,  5,  5, 10, -20, 100],
        [-20, -50, -5, -5, -5, -5, -50, -20],
        [ 10,  -5,  1,  1,  1,  1,  -5,  10],
        [  5,  -5,  1,  0,  0,  1,  -5,   5],
        [  5,  -5,  1,  0,  0,  1,  -5,   5],
        [ 10,  -5,  1,  1,  1,  1,  -5,  10],
        [-20, -50, -5, -5, -5, -5, -50, -20],
        [100, -20, 10,  5,  5, 10, -20, 100]
    ];
    
    let bestMove = validMoves[0];
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
        // 計算分數：位置權重 + 翻轉數量
        let score = weights[move.row][move.col] + move.flips.length * 2;
        
        // 額外策略：避免給對手角落機會
        if (isNearCorner(move.row, move.col)) {
            score -= 30;
        }
        
        // 優先考慮穩定的位置（邊）
        if (isEdge(move.row, move.col) && !isNearCorner(move.row, move.col)) {
            score += 15;
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove;
}

// ===== 檢查是否在角落附近 =====
function isNearCorner(row, col) {
    const corners = [
        [0, 0], [0, 7], [7, 0], [7, 7]
    ];
    
    for (const [cr, cc] of corners) {
        const dr = Math.abs(row - cr);
        const dc = Math.abs(col - cc);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1) || (dr === 1 && dc === 1)) {
            // 檢查角落是否已被佔據
            if (board[cr][cc] === EMPTY) {
                return true;
            }
        }
    }
    return false;
}

// ===== 檢查是否在邊緣 =====
function isEdge(row, col) {
    return row === 0 || row === SIZE - 1 || col === 0 || col === SIZE - 1;
}

// ===== 更新分數 =====
function updateScores() {
    let blackCount = 0;
    let whiteCount = 0;
    
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (board[row][col] === BLACK) blackCount++;
            if (board[row][col] === WHITE) whiteCount++;
        }
    }
    
    blackScoreEl.textContent = blackCount;
    whiteScoreEl.textContent = whiteCount;
}

// ===== 更新回合指示器 =====
function updateTurnIndicator() {
    const playerName = currentPlayer === BLACK ? '玩家' : '電腦';
    turnIndicatorEl.textContent = `輪到：${playerName}`;
}

// ===== 檢查遊戲是否結束 =====
function checkGameEnd() {
    const blackMoves = getValidMoves(BLACK).length;
    const whiteMoves = getValidMoves(WHITE).length;
    
    // 雙方都無子可下，或棋盤已滿
    if (blackMoves === 0 && whiteMoves === 0) {
        endGame();
        return true;
    }
    
    // 檢查棋盤是否已滿
    let emptyCells = 0;
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (board[row][col] === EMPTY) emptyCells++;
        }
    }
    
    if (emptyCells === 0) {
        endGame();
        return true;
    }
    
    return false;
}

// ===== 結束遊戲 =====
function endGame() {
    gameActive = false;
    
    let blackCount = 0;
    let whiteCount = 0;
    
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (board[row][col] === BLACK) blackCount++;
            if (board[row][col] === WHITE) whiteCount++;
        }
    }
    
    // 更新對話框內容
    modalBlackScore.textContent = blackCount;
    modalWhiteScore.textContent = whiteCount;
    
    let resultText = '';
    if (blackCount > whiteCount) {
        resultText = '🎉 恭喜！玩家獲勝！';
    } else if (whiteCount > blackCount) {
        resultText = '💻 電腦獲勝！';
    } else {
        resultText = '🤝 平手！';
    }
    
    modalResult.textContent = resultText;
    
    // 顯示對話框
    setTimeout(() => {
        gameOverModal.classList.add('show');
    }, 500);
}

// ===== 工具函數：延遲 =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 事件監聽器 =====
restartBtn.addEventListener('click', initGame);
modalRestartBtn.addEventListener('click', initGame);
difficultySelect.addEventListener('change', (e) => {
    difficulty = e.target.value;
});

// ===== 初始化遊戲 =====
initGame();
