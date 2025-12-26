/**
 * ==========================================
 * 九路圍棋 - 禪弈之道
 * Award-Winning Game Logic
 * ==========================================
 * 
 * @description Professional Go Game Implementation
 * @author 1102945
 * @version 2.0.0
 * @license Educational Use
 */

'use strict';

// ==========================================
// Constants & Configuration
// ==========================================
const CONFIG = {
    BOARD_SIZE: 9,
    CELL_SIZE: 480 / 8, // Total board size / (grid lines - 1)
    STONE_SIZE: 46,
    WINNING_SCORE: 41,
    MAX_CONSECUTIVE_PASSES: 2,
    
    PLAYER: {
        BLACK: 1,
        WHITE: -1,
        NONE: 0
    },
    
    ANIMATION_DELAYS: {
        AI_MOVE: 500,
        PASS: 1500,
        END_GAME: 1500,
        CAPTURE: 600
    }
};

// ==========================================
// Main Game Class
// ==========================================
class GoGame {
    constructor() {
        this.initializeGameState();
        this.initializeDOM();
        this.renderBoard();
        this.updateUI();
    }

    /**
     * Initialize game state
     */
    initializeGameState() {
        this.board = Array(CONFIG.BOARD_SIZE).fill(null)
            .map(() => Array(CONFIG.BOARD_SIZE).fill(CONFIG.PLAYER.NONE));
        
        this.currentPlayer = CONFIG.PLAYER.BLACK;
        this.moveHistory = [];
        this.consecutivePasses = 0;
        this.aiEnabled = true;
        this.gameOver = false;
        this.lastMove = null;
        
        // Statistics
        this.moveCount = 0;
        this.blackCaptures = 0;
        this.whiteCaptures = 0;
    }

    /**
     * Initialize DOM references
     */
    initializeDOM() {
        this.elements = {
            board: document.getElementById('gameBoard'),
            statusPanel: document.getElementById('statusPanel'),
            statusText: document.getElementById('statusText'),
            
            // Controls
            undoBtn: document.getElementById('undoBtn'),
            newGameBtn: document.getElementById('newGameBtn'),
            passBtn: document.getElementById('passBtn'),
            aiBtn: document.getElementById('aiBtn'),
            endBtn: document.getElementById('endBtn'),
            
            // Scores
            blackCard: document.getElementById('blackCard'),
            whiteCard: document.getElementById('whiteCard'),
            blackTotal: document.getElementById('blackTotal'),
            whiteTotal: document.getElementById('whiteTotal'),
            blackStones: document.getElementById('blackStones'),
            whiteStones: document.getElementById('whiteStones'),
            blackTerritory: document.getElementById('blackTerritory'),
            whiteTerritory: document.getElementById('whiteTerritory'),
            
            // Stats
            moveCount: document.getElementById('moveCount'),
            blackCaptures: document.getElementById('blackCaptures'),
            whiteCaptures: document.getElementById('whiteCaptures'),
            passCounter: document.getElementById('passCounter'),
            aiStatus: document.getElementById('aiStatus'),
            
            // Modal
            modal: document.getElementById('gameOverModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalBody: document.getElementById('modalBody')
        };
        
        this.attachEventListeners();
    }

    /**
     * Attach event listeners to controls
     */
    attachEventListeners() {
        this.elements.undoBtn.addEventListener('click', () => this.undoMove());
        this.elements.newGameBtn.addEventListener('click', () => this.newGame());
        this.elements.passBtn.addEventListener('click', () => this.pass());
        this.elements.aiBtn.addEventListener('click', () => this.toggleAI());
        this.elements.endBtn.addEventListener('click', () => this.endGame('玩家手動終局'));
        
        document.getElementById('newGameFromModal')?.addEventListener('click', () => {
            this.closeModal();
            this.newGame();
        });
        
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.closeModal();
        });
    }

    /**
     * Render the game board with grid lines and intersections
     */
    renderBoard() {
        this.elements.board.innerHTML = '';
        
        // Create grid lines
        for (let i = 0; i < CONFIG.BOARD_SIZE; i++) {
            // Horizontal lines
            const hLine = this.createElement('div', 'grid-line horizontal');
            hLine.style.top = `${i * CONFIG.CELL_SIZE}px`;
            this.elements.board.appendChild(hLine);
            
            // Vertical lines
            const vLine = this.createElement('div', 'grid-line vertical');
            vLine.style.left = `${i * CONFIG.CELL_SIZE}px`;
            this.elements.board.appendChild(vLine);
        }
        
        // Create star points (2-2, 2-6, 6-2, 6-6, 4-4)
        const starPoints = [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]];
        starPoints.forEach(([row, col]) => {
            const star = this.createElement('div', 'star-point');
            star.style.left = `${col * CONFIG.CELL_SIZE}px`;
            star.style.top = `${row * CONFIG.CELL_SIZE}px`;
            this.elements.board.appendChild(star);
        });
        
        // Create intersections
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                const intersection = this.createElement('div', 'intersection');
                intersection.dataset.row = row;
                intersection.dataset.col = col;
                intersection.style.left = `${col * CONFIG.CELL_SIZE}px`;
                intersection.style.top = `${row * CONFIG.CELL_SIZE}px`;
                
                intersection.addEventListener('click', (e) => this.handleIntersectionClick(e));
                this.elements.board.appendChild(intersection);
            }
        }
    }

    /**
     * Handle intersection click
     */
    handleIntersectionClick(event) {
        if (this.currentPlayer !== CONFIG.PLAYER.BLACK || this.gameOver) return;
        
        const row = parseInt(event.currentTarget.dataset.row);
        const col = parseInt(event.currentTarget.dataset.col);
        
        if (this.isValidMove(row, col, this.currentPlayer)) {
            this.makeMove(row, col, this.currentPlayer);
            this.consecutivePasses = 0;
            this.updatePassButton();
            
            if (this.aiEnabled && !this.gameOver) {
                setTimeout(() => this.aiMove(), CONFIG.ANIMATION_DELAYS.AI_MOVE);
            }
        } else {
            this.showInvalidMoveWarning(row, col);
        }
    }

    /**
     * Show warning for invalid move
     */
    showInvalidMoveWarning(row, col) {
        const warning = this.createElement('div', 'warning-indicator');
        warning.style.left = `${col * CONFIG.CELL_SIZE}px`;
        warning.style.top = `${row * CONFIG.CELL_SIZE}px`;
        this.elements.board.appendChild(warning);
        
        setTimeout(() => warning.remove(), 1000);
        
        this.setStatus('⚠️ 此位置無氣或違反規則！', 'warning');
        setTimeout(() => this.updateStatus(), 1500);
    }

    /**
     * Check if move is valid
     */
    isValidMove(row, col, player) {
        // Position must be empty
        if (this.board[row][col] !== CONFIG.PLAYER.NONE) return false;
        
        // Create temporary board
        const tempBoard = this.board.map(r => [...r]);
        tempBoard[row][col] = player;
        const opponent = -player;
        
        // Check if move captures opponent stones
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.isInBounds(nr, nc) && tempBoard[nr][nc] === opponent) {
                if (!this.hasLiberties(tempBoard, nr, nc, opponent)) {
                    return true; // Can capture
                }
            }
        }
        
        // Check if placed stone has liberties (suicide rule)
        return this.hasLiberties(tempBoard, row, col, player);
    }

    /**
     * Check if position is within board bounds
     */
    isInBounds(row, col) {
        return row >= 0 && row < CONFIG.BOARD_SIZE && 
               col >= 0 && col < CONFIG.BOARD_SIZE;
    }

    /**
     * Check if a group has liberties (freedoms)
     */
    hasLiberties(board, row, col, player) {
        const visited = Array(CONFIG.BOARD_SIZE).fill(null)
            .map(() => Array(CONFIG.BOARD_SIZE).fill(false));
        return this.dfsLiberties(board, row, col, player, visited);
    }

    /**
     * DFS to find liberties
     */
    dfsLiberties(board, row, col, player, visited) {
        if (!this.isInBounds(row, col)) return false;
        if (visited[row][col]) return false;
        if (board[row][col] !== player) {
            return board[row][col] === CONFIG.PLAYER.NONE;
        }
        
        visited[row][col] = true;
        
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            if (this.dfsLiberties(board, row + dr, col + dc, player, visited)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Make a move
     */
    makeMove(row, col, player) {
        // Save state for undo
        this.saveState(row, col, player);
        
        // Place stone
        this.board[row][col] = player;
        this.moveCount++;
        this.lastMove = { row, col };
        
        // Check for captures
        const opponent = -player;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        let capturedCount = 0;
        
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.isInBounds(nr, nc) && this.board[nr][nc] === opponent) {
                if (!this.hasLiberties(this.board, nr, nc, opponent)) {
                    capturedCount += this.removeGroup(nr, nc, opponent);
                }
            }
        }
        
        // Update capture count
        if (capturedCount > 0) {
            if (player === CONFIG.PLAYER.BLACK) {
                this.blackCaptures += capturedCount;
            } else {
                this.whiteCaptures += capturedCount;
            }
        }
        
        // Switch player
        this.currentPlayer = -player;
        
        // Update UI
        this.renderStones();
        this.updateUI();
        this.checkAtari();
    }

    /**
     * Save current state to history
     */
    saveState(row, col, player) {
        this.moveHistory.push({
            board: this.board.map(r => [...r]),
            row, col, player,
            blackCaptures: this.blackCaptures,
            whiteCaptures: this.whiteCaptures,
            moveCount: this.moveCount
        });
    }

    /**
     * Remove captured group
     */
    removeGroup(row, col, player) {
        const visited = Array(CONFIG.BOARD_SIZE).fill(null)
            .map(() => Array(CONFIG.BOARD_SIZE).fill(false));
        const group = [];
        this.findGroup(row, col, player, visited, group);
        
        // Animate capture
        group.forEach(({ r, c }) => {
            const stone = this.elements.board.querySelector(
                `.stone[data-row="${r}"][data-col="${c}"]`
            );
            if (stone) {
                stone.classList.add('captured');
                setTimeout(() => stone.remove(), CONFIG.ANIMATION_DELAYS.CAPTURE);
            }
            this.board[r][c] = CONFIG.PLAYER.NONE;
        });
        
        return group.length;
    }

    /**
     * Find all stones in a group
     */
    findGroup(row, col, player, visited, result) {
        if (!this.isInBounds(row, col)) return;
        if (visited[row][col] || this.board[row][col] !== player) return;
        
        visited[row][col] = true;
        result.push({ r: row, c: col });
        
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            this.findGroup(row + dr, col + dc, player, visited, result);
        }
    }

    /**
     * Check for atari (stones with only 1 liberty) and show warning
     */
    checkAtari() {
        // Remove old warnings
        this.elements.board.querySelectorAll('.warning-indicator').forEach(el => el.remove());
        
        // Check current player's stones for atari
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                if (this.board[row][col] === this.currentPlayer) {
                    const liberties = this.countLiberties(row, col, this.currentPlayer);
                    if (liberties === 1) {
                        this.showAtariWarning(row, col);
                    }
                }
            }
        }
    }

    /**
     * Count liberties for a group
     */
    countLiberties(row, col, player) {
        const visited = Array(CONFIG.BOARD_SIZE).fill(null)
            .map(() => Array(CONFIG.BOARD_SIZE).fill(false));
        const liberties = new Set();
        this.findLiberties(row, col, player, visited, liberties);
        return liberties.size;
    }

    /**
     * Find all liberties for a group
     */
    findLiberties(row, col, player, visited, liberties) {
        if (!this.isInBounds(row, col)) return;
        if (visited[row][col]) return;
        
        if (this.board[row][col] === CONFIG.PLAYER.NONE) {
            liberties.add(`${row},${col}`);
            return;
        }
        
        if (this.board[row][col] !== player) return;
        
        visited[row][col] = true;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            this.findLiberties(row + dr, col + dc, player, visited, liberties);
        }
    }

    /**
     * Show atari warning animation
     */
    showAtariWarning(row, col) {
        const warning = this.createElement('div', 'warning-indicator');
        warning.style.left = `${col * CONFIG.CELL_SIZE}px`;
        warning.style.top = `${row * CONFIG.CELL_SIZE}px`;
        this.elements.board.appendChild(warning);
    }

    /**
     * Render all stones on the board
     */
    renderStones() {
        // Remove existing stones and territory markers
        this.elements.board.querySelectorAll('.stone, .territory-marker').forEach(el => el.remove());
        
        // Render stones
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                const player = this.board[row][col];
                if (player !== CONFIG.PLAYER.NONE) {
                    const stone = this.createStone(row, col, player);
                    this.elements.board.appendChild(stone);
                }
            }
        }
        
        // Update intersection states
        this.elements.board.querySelectorAll('.intersection').forEach(int => {
            const row = parseInt(int.dataset.row);
            const col = parseInt(int.dataset.col);
            int.classList.toggle('has-stone', this.board[row][col] !== CONFIG.PLAYER.NONE);
        });
    }

    /**
     * Create a stone element
     */
    createStone(row, col, player) {
        const stone = this.createElement('div', 'stone');
        stone.classList.add(player === CONFIG.PLAYER.BLACK ? 'black' : 'white');
        stone.dataset.row = row;
        stone.dataset.col = col;
        stone.style.left = `${col * CONFIG.CELL_SIZE}px`;
        stone.style.top = `${row * CONFIG.CELL_SIZE}px`;
        
        if (this.lastMove && row === this.lastMove.row && col === this.lastMove.col) {
            stone.classList.add('last-move');
        }
        
        return stone;
    }

    /**
     * Check if player has any valid moves
     */
    hasValidMoves(player) {
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                if (this.isValidMove(row, col, player)) return true;
            }
        }
        return false;
    }

    /**
     * Pass turn
     */
    pass() {
        if (this.gameOver) return;
        
        this.consecutivePasses++;
        this.updatePassButton();
        
        // Check end game conditions
        if (this.consecutivePasses >= CONFIG.MAX_CONSECUTIVE_PASSES) {
            this.endGame('雙方連續讓子2次');
            return;
        }
        
        if (!this.hasValidMoves(CONFIG.PLAYER.BLACK) && 
            !this.hasValidMoves(CONFIG.PLAYER.WHITE)) {
            this.endGame('雙方全無合法棋步');
            return;
        }
        
        this.currentPlayer = -this.currentPlayer;
        this.updateStatus();
        
        if (this.aiEnabled && this.currentPlayer === CONFIG.PLAYER.WHITE) {
            setTimeout(() => this.aiMove(), CONFIG.ANIMATION_DELAYS.AI_MOVE);
        }
    }

    /**
     * AI move logic
     */
    aiMove() {
        if (this.currentPlayer !== CONFIG.PLAYER.WHITE || !this.aiEnabled || this.gameOver) return;
        
        if (!this.hasValidMoves(CONFIG.PLAYER.WHITE)) {
            this.pass();
            return;
        }
        
        const moves = this.evaluateAllMoves();
        
        if (moves.length > 0) {
            // Select from top moves with some randomness for variety
            moves.sort((a, b) => b.score - a.score);
            const topMoves = moves.filter(m => m.score >= moves[0].score - 10);
            const chosen = topMoves[Math.floor(Math.random() * Math.min(3, topMoves.length))];
            
            this.makeMove(chosen.row, chosen.col, CONFIG.PLAYER.WHITE);
            this.consecutivePasses = 0;
            this.updatePassButton();
        } else {
            this.pass();
        }
    }

    /**
     * Evaluate all possible moves for AI
     */
    evaluateAllMoves() {
        const moves = [];
        
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                if (this.isValidMove(row, col, CONFIG.PLAYER.WHITE)) {
                    const score = this.evaluateMove(row, col);
                    moves.push({ row, col, score });
                }
            }
        }
        
        return moves;
    }

    /**
     * Evaluate move quality for AI
     */
    evaluateMove(row, col) {
        let score = 0;
        
        // Star points priority
        if ((row === 2 || row === 6) && (col === 2 || col === 6)) score += 20;
        if (row === 4 && col === 4) score += 25; // Center point
        
        // Corner and edge preference
        if ((row === 0 || row === 8) && (col === 0 || col === 8)) score += 15;
        if (row === 0 || row === 8 || col === 0 || col === 8) score += 10;
        
        // Proximity to opponent stones
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];
        
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.isInBounds(nr, nc)) {
                if (this.board[nr][nc] === CONFIG.PLAYER.BLACK) score += 8;
                if (this.board[nr][nc] === CONFIG.PLAYER.WHITE) score += 5;
            }
        }
        
        // Capture opportunities (high priority)
        const tempBoard = this.board.map(r => [...r]);
        tempBoard[row][col] = CONFIG.PLAYER.WHITE;
        
        for (const [dr, dc] of directions.slice(0, 4)) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.isInBounds(nr, nc) && tempBoard[nr][nc] === CONFIG.PLAYER.BLACK) {
                if (!this.hasLiberties(tempBoard, nr, nc, CONFIG.PLAYER.BLACK)) {
                    score += 40; // Very high value for captures
                }
            }
        }
        
        // Openness (prefer positions with more liberties)
        let emptyNeighbors = 0;
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.isInBounds(nr, nc) && this.board[nr][nc] === CONFIG.PLAYER.NONE) {
                emptyNeighbors++;
            }
        }
        score += emptyNeighbors * 3;
        
        return score;
    }

    /**
     * Undo last move
     */
    undoMove() {
        if (this.moveHistory.length === 0 || this.gameOver) return;
        
        const lastState = this.moveHistory.pop();
        
        if (this.moveHistory.length > 0) {
            const prevState = this.moveHistory[this.moveHistory.length - 1];
            this.board = prevState.board.map(r => [...r]);
            this.blackCaptures = prevState.blackCaptures;
            this.whiteCaptures = prevState.whiteCaptures;
            this.moveCount = prevState.moveCount;
        } else {
            this.board = Array(CONFIG.BOARD_SIZE).fill(null)
                .map(() => Array(CONFIG.BOARD_SIZE).fill(CONFIG.PLAYER.NONE));
            this.blackCaptures = 0;
            this.whiteCaptures = 0;
            this.moveCount = 0;
        }
        
        this.currentPlayer = lastState.player;
        this.consecutivePasses = 0;
        this.lastMove = null;
        
        this.updatePassButton();
        this.renderStones();
        this.updateUI();
        this.checkAtari();
    }

    /**
     * End the game and calculate final scores
     */
    endGame(reason = '') {
        this.gameOver = true;
        this.elements.undoBtn.disabled = true;
        this.elements.passBtn.disabled = true;
        
        const result = this.calculateFinalScore();
        this.displayTerritories(result.territories);
        this.showGameOverModal(result, reason);
        
        this.setStatus('🏁 遊戲結束', 'game-over');
    }

    /**
     * Calculate final score
     */
    calculateFinalScore() {
        let blackStones = 0;
        let whiteStones = 0;
        
        // Count stones
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                if (this.board[row][col] === CONFIG.PLAYER.BLACK) blackStones++;
                else if (this.board[row][col] === CONFIG.PLAYER.WHITE) whiteStones++;
            }
        }
        
        // Calculate territories
        const visited = Array(CONFIG.BOARD_SIZE).fill(null)
            .map(() => Array(CONFIG.BOARD_SIZE).fill(false));
        let blackTerritory = 0;
        let whiteTerritory = 0;
        const territories = [];
        
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                if (this.board[row][col] === CONFIG.PLAYER.NONE && !visited[row][col]) {
                    const territory = this.calculateTerritory(row, col, visited);
                    territories.push(territory);
                    
                    if (territory.owner === CONFIG.PLAYER.BLACK) {
                        blackTerritory += territory.size;
                    } else if (territory.owner === CONFIG.PLAYER.WHITE) {
                        whiteTerritory += territory.size;
                    }
                }
            }
        }
        
        const blackTotal = blackStones + blackTerritory;
        const whiteTotal = whiteStones + whiteTerritory;
        
        return {
            blackStones,
            whiteStones,
            blackTerritory,
            whiteTerritory,
            blackTotal,
            whiteTotal,
            winner: blackTotal > whiteTotal ? CONFIG.PLAYER.BLACK :
                   (whiteTotal > blackTotal ? CONFIG.PLAYER.WHITE : CONFIG.PLAYER.NONE),
            margin: Math.abs(blackTotal - whiteTotal),
            territories
        };
    }

    /**
     * Calculate territory ownership
     */
    calculateTerritory(startRow, startCol, visited) {
        const stack = [{ r: startRow, c: startCol }];
        const points = [];
        let blackBorder = 0;
        let whiteBorder = 0;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        while (stack.length > 0) {
            const { r, c } = stack.pop();
            
            if (!this.isInBounds(r, c)) continue;
            if (visited[r][c] || this.board[r][c] !== CONFIG.PLAYER.NONE) continue;
            
            visited[r][c] = true;
            points.push({ r, c });
            
            // Count borders
            for (const [dr, dc] of directions) {
                const nr = r + dr;
                const nc = c + dc;
                if (this.isInBounds(nr, nc)) {
                    if (this.board[nr][nc] === CONFIG.PLAYER.BLACK) blackBorder++;
                    else if (this.board[nr][nc] === CONFIG.PLAYER.WHITE) whiteBorder++;
                    else if (!visited[nr][nc]) {
                        stack.push({ r: nr, c: nc });
                    }
                }
            }
        }
        
        // Determine owner
        let owner = CONFIG.PLAYER.NONE;
        if (blackBorder > 0 && whiteBorder === 0) owner = CONFIG.PLAYER.BLACK;
        else if (whiteBorder > 0 && blackBorder === 0) owner = CONFIG.PLAYER.WHITE;
        
        return {
            size: points.length,
            owner,
            points,
            blackBorder,
            whiteBorder
        };
    }

    /**
     * Display territory markers on board
     */
    displayTerritories(territories) {
        territories.forEach(territory => {
            if (territory.owner !== CONFIG.PLAYER.NONE) {
                territory.points.forEach(({ r, c }) => {
                    const marker = this.createElement('div', 'territory-marker');
                    marker.classList.add(
                        territory.owner === CONFIG.PLAYER.BLACK ? 
                        'black-territory' : 'white-territory'
                    );
                    marker.style.left = `${c * CONFIG.CELL_SIZE}px`;
                    marker.style.top = `${r * CONFIG.CELL_SIZE}px`;
                    this.elements.board.appendChild(marker);
                });
            }
        });
    }

    /**
     * Show game over modal
     */
    showGameOverModal(result, reason) {
        const winnerText = result.winner === CONFIG.PLAYER.BLACK ? '🖤 黑棋獲勝！' :
                          result.winner === CONFIG.PLAYER.WHITE ? '⚪ 白棋獲勝！' :
                          '⚖️ 平局！';
        
        document.getElementById('modalTitle').textContent = winnerText;
        document.getElementById('winnerIcon').textContent = 
            result.winner === CONFIG.PLAYER.BLACK ? '👤' :
            result.winner === CONFIG.PLAYER.WHITE ? '🤖' : '🤝';
        
        document.getElementById('resultReason').textContent = `終局原因：${reason}`;
        
        // Final scores
        document.getElementById('finalBlackTotal').textContent = result.blackTotal;
        document.getElementById('finalWhiteTotal').textContent = result.whiteTotal;
        document.getElementById('finalBlackDetail').textContent = 
            `活棋 ${result.blackStones} + 圍地 ${result.blackTerritory}`;
        document.getElementById('finalWhiteDetail').textContent = 
            `活棋 ${result.whiteStones} + 圍地 ${result.whiteTerritory}`;
        
        document.getElementById('marginDisplay').textContent = 
            `分差：${result.margin} 目`;
        
        document.getElementById('gameSummary').textContent = 
            `總回合數：${this.moveCount} 手 | 提子數：黑 ${this.blackCaptures} : 白 ${this.whiteCaptures}`;
        
        this.elements.modal.classList.add('active');
    }

    /**
     * Close modal
     */
    closeModal() {
        this.elements.modal.classList.remove('active');
    }

    /**
     * Toggle AI
     */
    toggleAI() {
        this.aiEnabled = !this.aiEnabled;
        this.elements.aiStatus.textContent = this.aiEnabled ? 'ON' : 'OFF';
        this.elements.aiBtn.style.background = this.aiEnabled ?
            'linear-gradient(135deg, rgba(46, 125, 50, 0.4), rgba(46, 125, 50, 0.2))' :
            'rgba(45, 36, 36, 0.6)';
    }

    /**
     * Start new game
     */
    newGame() {
        this.initializeGameState();
        this.renderBoard();
        this.updateUI();
        this.elements.undoBtn.disabled = false;
        this.elements.passBtn.disabled = false;
    }

    /**
     * Update all UI elements
     */
    updateUI() {
        this.updateStatus();
        this.updateScores();
        this.updateStats();
    }

    /**
     * Update status panel
     */
    updateStatus() {
        if (this.gameOver) return;
        
        const canMove = this.hasValidMoves(this.currentPlayer);
        const opponentCanMove = this.hasValidMoves(-this.currentPlayer);
        const playerName = this.currentPlayer === CONFIG.PLAYER.BLACK ? '🖤 黑棋' : '⚪ 白棋';
        
        // Update active card
        this.elements.blackCard.classList.toggle('active', 
            this.currentPlayer === CONFIG.PLAYER.BLACK);
        this.elements.whiteCard.classList.toggle('active', 
            this.currentPlayer === CONFIG.PLAYER.WHITE);
        
        if (canMove) {
            const action = this.currentPlayer === CONFIG.PLAYER.BLACK ? 
                '請在交叉點下子' : 'AI思考中...';
            this.setStatus(`${playerName} 回合 - ${action}`, 
                this.currentPlayer === CONFIG.PLAYER.BLACK ? 'black-turn' : 'white-turn');
        } else if (!opponentCanMove) {
            this.setStatus('⚠️ 雙方全無合法棋步，即將自動終局', 'warning');
            setTimeout(() => this.endGame('雙方全無合法棋步'), CONFIG.ANIMATION_DELAYS.END_GAME);
        } else {
            this.setStatus(`${playerName} 無合法棋步，自動讓子`, 'warning');
            setTimeout(() => this.pass(), CONFIG.ANIMATION_DELAYS.PASS);
        }
    }

    /**
     * Set status text and style
     */
    setStatus(text, className = '') {
        this.elements.statusText.textContent = text;
        this.elements.statusPanel.className = 'status-panel ' + className;
    }

    /**
     * Update score display
     */
    updateScores() {
        let blackStones = 0;
        let whiteStones = 0;
        
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                if (this.board[row][col] === CONFIG.PLAYER.BLACK) blackStones++;
                else if (this.board[row][col] === CONFIG.PLAYER.WHITE) whiteStones++;
            }
        }
        
        // Estimate territory (simplified)
        const visited = Array(CONFIG.BOARD_SIZE).fill(null)
            .map(() => Array(CONFIG.BOARD_SIZE).fill(false));
        let blackTerritory = 0;
        let whiteTerritory = 0;
        
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                if (this.board[row][col] === CONFIG.PLAYER.NONE && !visited[row][col]) {
                    const territory = this.calculateTerritory(row, col, visited);
                    if (territory.owner === CONFIG.PLAYER.BLACK) blackTerritory += territory.size;
                    else if (territory.owner === CONFIG.PLAYER.WHITE) whiteTerritory += territory.size;
                }
            }
        }
        
        this.elements.blackTotal.textContent = blackStones + blackTerritory;
        this.elements.whiteTotal.textContent = whiteStones + whiteTerritory;
        this.elements.blackStones.textContent = blackStones;
        this.elements.whiteStones.textContent = whiteStones;
        this.elements.blackTerritory.textContent = blackTerritory;
        this.elements.whiteTerritory.textContent = whiteTerritory;
    }

    /**
     * Update statistics
     */
    updateStats() {
        this.elements.moveCount.textContent = this.moveCount;
        this.elements.blackCaptures.textContent = this.blackCaptures;
        this.elements.whiteCaptures.textContent = this.whiteCaptures;
    }

    /**
     * Update pass button
     */
    updatePassButton() {
        this.elements.passCounter.textContent = `${this.consecutivePasses}/2`;
    }

    /**
     * Helper: Create element with class
     */
    createElement(tag, className = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        return element;
    }
}

// ==========================================
// Initialize Game on Page Load
// ==========================================
let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new GoGame();
    
    // Prevent accidental page close
    window.addEventListener('beforeunload', (e) => {
        if (game && game.moveCount > 0 && !game.gameOver) {
            e.preventDefault();
            e.returnValue = '確定要離開嗎？遊戲進度將會遺失。';
        }
    });
});
