const SIZE = 8;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

let board = [];
let currentPlayer = BLACK;
let difficulty = 'basic';
let gameActive = true;
let isAnimating = false;

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

function initGame() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    
    const mid = SIZE / 2;
    board[mid - 1][mid - 1] = WHITE;
    board[mid][mid] = WHITE;
    board[mid - 1][mid] = BLACK;
    board[mid][mid - 1] = BLACK;
    
    currentPlayer = BLACK;
    gameActive = true;
    isAnimating = false;
    difficulty = difficultySelect.value;
    
    gameOverModal.classList.remove('show');
    statusMessageEl.textContent = '';
    
    renderBoard();
    updateScores();
    updateTurnIndicator();
}

function isInBounds(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function getFlipsInDirection(row, col, player, direction) {
    const opponent = player === BLACK ? WHITE : BLACK;
    const flips = [];
    let r = row + direction[0];
    let c = col + direction[1];
    
    while (isInBounds(r, c) && board[r][c] === opponent) {
        flips.push([r, c]);
        r += direction[0];
        c += direction[1];
    }
    
    if (flips.length > 0 && isInBounds(r, c) && board[r][c] === player) {
        return flips;
    }
    
    return [];
}

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

async function placeDisc(row, col, player) {
    const flips = getAllFlips(row, col, player);
    
    if (flips.length === 0) {
        return false;
    }
    
    isAnimating = true;
    
    board[row][col] = player;
    
    const cell = getCellElement(row, col);
    const disc = createDisc(player);
    disc.classList.add('placing');
    cell.innerHTML = '';
    cell.appendChild(disc);
    
    await sleep(500);
    
    for (const [flipRow, flipCol] of flips) {
        await flipDisc(flipRow, flipCol, player);
        await sleep(80);
    }
    
    isAnimating = false;
    return true;
}

async function flipDisc(row, col, toPlayer) {
    board[row][col] = toPlayer;
    const cell = getCellElement(row, col);
    const disc = cell.querySelector('.disc');
    
    if (disc) {
        disc.classList.add('flipping');
        
        await sleep(300);
        disc.className = 'disc flipping';
        disc.classList.add(toPlayer === BLACK ? 'disc-black' : 'disc-white');
        
        await sleep(300);
        disc.classList.remove('flipping');
    }
}

function getCellElement(row, col) {
    return boardEl.children[row * SIZE + col];
}

function createDisc(player) {
    const disc = document.createElement('div');
    disc.className = 'disc';
    disc.classList.add(player === BLACK ? 'disc-black' : 'disc-white');
    return disc;
}

function renderBoard() {
    boardEl.innerHTML = '';
    const validMoves = gameActive && currentPlayer === BLACK ? getValidMoves(currentPlayer) : [];
    
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            if (board[row][col] !== EMPTY) {
                const disc = createDisc(board[row][col]);
                cell.appendChild(disc);
            }
            
            const validMove = validMoves.find(m => m.row === row && m.col === col);
            if (validMove) {
                cell.classList.add('valid-move');
                
                const flipCount = document.createElement('div');
                flipCount.className = 'flip-count';
                flipCount.textContent = validMove.flips.length;
                cell.appendChild(flipCount);
                
                cell.addEventListener('click', () => handleCellClick(row, col));
            }
            
            boardEl.appendChild(cell);
        }
    }
}

async function handleCellClick(row, col) {
    if (!gameActive || isAnimating || currentPlayer !== BLACK) {
        return;
    }
    
    const success = await placeDisc(row, col, BLACK);
    
    if (success) {
        updateScores();
        await sleep(200);
        
        currentPlayer = WHITE;
        updateTurnIndicator();
        
        if (!checkGameEnd()) {
            statusMessageEl.textContent = '電腦思考中...';
            await sleep(800);
            await computerMove();
        }
    }
}

async function computerMove() {
    if (!gameActive || isAnimating) {
        return;
    }
    
    const validMoves = getValidMoves(WHITE);
    
    if (validMoves.length === 0) {
        statusMessageEl.textContent = '電腦無子可下，跳過回合';
        await sleep(1500);
        currentPlayer = BLACK;
        updateTurnIndicator();
        
        if (getValidMoves(BLACK).length === 0) {
            endGame();
        } else {
            statusMessageEl.textContent = '';
            renderBoard();
        }
        return;
    }
    
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
    
    currentPlayer = BLACK;
    updateTurnIndicator();
    
    if (!checkGameEnd()) {
        if (getValidMoves(BLACK).length === 0) {
            statusMessageEl.textContent = '玩家無子可下，跳過回合';
            await sleep(1500);
            currentPlayer = WHITE;
            updateTurnIndicator();
            
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

function getAdvancedMove(validMoves) {
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
        let score = weights[move.row][move.col] + move.flips.length * 2;
        
        if (isNearCorner(move.row, move.col)) {
            score -= 30;
        }
        
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

function isNearCorner(row, col) {
    const corners = [
        [0, 0], [0, 7], [7, 0], [7, 7]
    ];
    
    for (const [cr, cc] of corners) {
        const dr = Math.abs(row - cr);
        const dc = Math.abs(col - cc);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1) || (dr === 1 && dc === 1)) {
            if (board[cr][cc] === EMPTY) {
                return true;
            }
        }
    }
    return false;
}

function isEdge(row, col) {
    return row === 0 || row === SIZE - 1 || col === 0 || col === SIZE - 1;
}

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

function updateTurnIndicator() {
    const playerName = currentPlayer === BLACK ? '玩家' : '電腦';
    turnIndicatorEl.textContent = `輪到：${playerName}`;
}

function checkGameEnd() {
    const blackMoves = getValidMoves(BLACK).length;
    const whiteMoves = getValidMoves(WHITE).length;
    
    if (blackMoves === 0 && whiteMoves === 0) {
        endGame();
        return true;
    }
    
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
    
    setTimeout(() => {
        gameOverModal.classList.add('show');
    }, 500);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

restartBtn.addEventListener('click', initGame);
modalRestartBtn.addEventListener('click', initGame);
difficultySelect.addEventListener('change', (e) => {
    difficulty = e.target.value;
});

initGame();
