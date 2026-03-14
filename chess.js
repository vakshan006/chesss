/* ============================================================
   Chess Royale – Full OOP Engine + AI + Particles + Sound
   ============================================================ */

// ================================================================
//  PIECE
// ================================================================

class Piece {
    constructor(color, type) {
        this.color = color;
        this.type = type;
        this.hasMoved = false;
    }
    get symbol() { return Piece.SYMBOLS[this.color][this.type]; }
    get value() { return Piece.VALUES[this.type]; }

    static SYMBOLS = {
        white: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
        black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };
    static VALUES = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000 };

    static DIAGONALS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    static STRAIGHTS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    static KNIGHT_OFF = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

    clone() { const p = new Piece(this.color, this.type); p.hasMoved = this.hasMoved; return p; }
    toJSON() { return { color: this.color, type: this.type, hasMoved: this.hasMoved }; }

    pseudoLegalMoves(r, c, board) {
        switch (this.type) {
            case 'pawn': return this._pawn(r, c, board);
            case 'knight': return this._knight(r, c, board);
            case 'bishop': return this._slide(r, c, board, Piece.DIAGONALS);
            case 'rook': return this._slide(r, c, board, Piece.STRAIGHTS);
            case 'queen': return this._slide(r, c, board, [...Piece.DIAGONALS, ...Piece.STRAIGHTS]);
            case 'king': return this._king(r, c, board);
            default: return [];
        }
    }

    _pawn(r, c, board) {
        const m = [], dir = this.color === 'white' ? -1 : 1, start = this.color === 'white' ? 6 : 1;
        if (board.inBounds(r + dir, c) && !board.at(r + dir, c)) {
            m.push({ row: r + dir, col: c });
            if (r === start && !board.at(r + 2 * dir, c)) m.push({ row: r + 2 * dir, col: c });
        }
        for (const dc of [-1, 1]) {
            const nr = r + dir, nc = c + dc;
            if (!board.inBounds(nr, nc)) continue;
            const t = board.at(nr, nc);
            if (t && t.color !== this.color) m.push({ row: nr, col: nc });
            if (board.enPassantTarget && board.enPassantTarget.row === nr && board.enPassantTarget.col === nc)
                m.push({ row: nr, col: nc, enPassant: true });
        }
        return m;
    }
    _knight(r, c, board) {
        const m = [];
        for (const [dr, dc] of Piece.KNIGHT_OFF) {
            const nr = r + dr, nc = c + dc;
            if (board.inBounds(nr, nc)) { const t = board.at(nr, nc); if (!t || t.color !== this.color) m.push({ row: nr, col: nc }); }
        }
        return m;
    }
    _slide(r, c, board, dirs) {
        const m = [];
        for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (board.inBounds(nr, nc)) {
                const t = board.at(nr, nc);
                if (!t) { m.push({ row: nr, col: nc }); } else { if (t.color !== this.color) m.push({ row: nr, col: nc }); break; }
                nr += dr; nc += dc;
            }
        }
        return m;
    }
    _king(r, c, board) {
        const m = [];
        for (const [dr, dc] of [...Piece.DIAGONALS, ...Piece.STRAIGHTS]) {
            const nr = r + dr, nc = c + dc;
            if (board.inBounds(nr, nc)) { const t = board.at(nr, nc); if (!t || t.color !== this.color) m.push({ row: nr, col: nc }); }
        }
        return m;
    }
}

// ================================================================
//  BOARD
// ================================================================

class Board {
    constructor() {
        this.grid = Array.from({ length: 8 }, () => Array(8).fill(null));
        this.enPassantTarget = null;
    }
    at(r, c) { return this.grid[r][c]; }
    set(r, c, p) { this.grid[r][c] = p; }
    clear(r, c) { this.grid[r][c] = null; }
    inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    findKing(color) {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = this.at(r, c); if (p && p.type === 'king' && p.color === color) return { row: r, col: c }; }
        return null;
    }
    clone() {
        const b = new Board();
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = this.at(r, c); b.grid[r][c] = p ? p.clone() : null; }
        b.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        return b;
    }
    toJSON() {
        return {
            grid: this.grid.map(row => row.map(p => p ? p.toJSON() : null)),
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null
        };
    }
    static fromJSON(data) {
        if (!data) return null;
        const b = new Board();
        b.grid = data.grid.map(row => row.map(pData => {
            if (!pData) return null;
            const p = new Piece(pData.color, pData.type);
            p.hasMoved = pData.hasMoved;
            return p;
        }));
        b.enPassantTarget = data.enPassantTarget ? { ...data.enPassantTarget } : null;
        return b;
    }
    setup() {
        const order = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let c = 0; c < 8; c++) {
            this.set(0, c, new Piece('black', order[c]));
            this.set(1, c, new Piece('black', 'pawn'));
            this.set(6, c, new Piece('white', 'pawn'));
            this.set(7, c, new Piece('white', order[c]));
        }
        for (let r = 2; r < 6; r++) for (let c = 0; c < 8; c++) this.clear(r, c);
        this.enPassantTarget = null;
    }
    loadFEN(fen) {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) this.clear(r, c);
        const rows = fen.split(' ')[0].split('/');
        for (let r = 0; r < 8; r++) {
            let c = 0;
            for (let char of rows[r]) {
                if (/[1-8]/.test(char)) c += parseInt(char);
                else {
                    const color = /[A-Z]/.test(char) ? 'white' : 'black';
                    const map = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
                    const type = map[char.toLowerCase()];
                    if (type) this.set(r, c, new Piece(color, type));
                    c++;
                }
            }
        }
        this.enPassantTarget = null;
    }
}

// ================================================================
//  GAME  (rules engine)
// ================================================================

class Game {
    constructor() {
        this.board = new Board(); this.turn = 'white'; this.capturedByWhite = []; this.capturedByBlack = [];
        this.status = 'playing'; this.lastMove = null; this.pendingPromotion = null; this.history = [];
    }

    toJSON() {
        return {
            board: this.board.toJSON(),
            turn: this.turn,
            capturedByWhite: this.capturedByWhite.map(p => p.toJSON()),
            capturedByBlack: this.capturedByBlack.map(p => p.toJSON()),
            status: this.status,
            lastMove: this.lastMove,
            pendingPromotion: this.pendingPromotion,
            history: this.history.map(s => ({
                grid: s.grid.toJSON(),
                turn: s.turn,
                capW: s.capW.map(p => p.toJSON()),
                capB: s.capB.map(p => p.toJSON()),
                lastMove: s.lastMove,
                ep: s.ep
            }))
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        const g = new Game();
        g.board = Board.fromJSON(data.board);
        g.turn = data.turn;
        g.capturedByWhite = data.capturedByWhite.map(p => {
            const pObj = new Piece(p.color, p.type);
            pObj.hasMoved = p.hasMoved;
            return pObj;
        });
        g.capturedByBlack = data.capturedByBlack.map(p => {
            const pObj = new Piece(p.color, p.type);
            pObj.hasMoved = p.hasMoved;
            return pObj;
        });
        g.status = data.status || 'playing';
        g.lastMove = data.lastMove;
        g.pendingPromotion = data.pendingPromotion;
        g.history = data.history.map(s => ({
            grid: Board.fromJSON(s.grid),
            turn: s.turn,
            capW: s.capW.map(p => {
                const pObj = new Piece(p.color, p.type);
                pObj.hasMoved = p.hasMoved;
                return pObj;
            }),
            capB: s.capB.map(p => {
                const pObj = new Piece(p.color, p.type);
                pObj.hasMoved = p.hasMoved;
                return pObj;
            }),
            lastMove: s.lastMove,
            ep: s.ep
        }));
        return g;
    }

    reset() {
        this.board.setup(); this.turn = 'white'; this.capturedByWhite = []; this.capturedByBlack = [];
        this.status = 'playing'; this.lastMove = null; this.pendingPromotion = null; this.history = [];
    }

    loadFEN(fen) {
        this.board.loadFEN(fen);
        const parts = fen.split(' ');
        this.turn = parts.length > 1 && parts[1] === 'b' ? 'black' : 'white';
        this.capturedByWhite = []; this.capturedByBlack = [];
        this.status = 'playing'; this.lastMove = null; this.pendingPromotion = null; this.history = [];
        this._updateStatus();
    }

    _snapshot() {
        return {
            grid: this.board.clone(), turn: this.turn,
            capW: [...this.capturedByWhite.map(p => p.clone())], capB: [...this.capturedByBlack.map(p => p.clone())],
            lastMove: this.lastMove ? { ...this.lastMove } : null, ep: this.board.enPassantTarget ? { ...this.board.enPassantTarget } : null
        };
    }
    undo() {
        if (this.history.length === 0) return false;
        const s = this.history.pop();
        this.board = s.grid; this.turn = s.turn;
        this.capturedByWhite = s.capW; this.capturedByBlack = s.capB;
        this.lastMove = s.lastMove; this.board.enPassantTarget = s.ep;
        this.pendingPromotion = null; this._updateStatus(); return true;
    }

    isInCheck(color, board = this.board) {
        const king = board.findKing(color); if (!king) return false;
        const opp = color === 'white' ? 'black' : 'white';
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = board.at(r, c);
            if (p && p.color === opp) { if (p.pseudoLegalMoves(r, c, board).some(m => m.row === king.row && m.col === king.col)) return true; }
        }
        return false;
    }
    wouldBeInCheck(fromR, fromC, toR, toC, move = {}) {
        const sim = this.board.clone(); const piece = sim.at(fromR, fromC);
        if (move.enPassant) { sim.clear(piece.color === 'white' ? toR + 1 : toR - 1, toC); }
        sim.set(toR, toC, piece); sim.clear(fromR, fromC);
        if (move.castling) {
            const rf = move.castling === 'king' ? 7 : 0, rt = move.castling === 'king' ? toC - 1 : toC + 1;
            const rk = sim.at(toR, rf); sim.set(toR, rt, rk); sim.clear(toR, rf);
        }
        return this.isInCheck(piece.color, sim);
    }
    legalMoves(r, c) {
        const piece = this.board.at(r, c); if (!piece || piece.color !== this.turn) return [];
        let moves = piece.pseudoLegalMoves(r, c, this.board);
        if (piece.type === 'king' && !piece.hasMoved && !this.isInCheck(piece.color))
            moves = moves.concat(this._castling(r, c, piece));
        return moves.filter(m => !this.wouldBeInCheck(r, c, m.row, m.col, m));
    }
    allLegalMoves(color) {
        const all = [];
        const saved = this.turn; this.turn = color;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = this.board.at(r, c);
            if (p && p.color === color) {
                const moves = this.legalMoves(r, c);
                for (const m of moves) all.push({ fromR: r, fromC: c, ...m });
            }
        }
        this.turn = saved; return all;
    }

    _castling(r, c, king) {
        const m = [], row = king.color === 'white' ? 7 : 0; if (r !== row) return m;
        const rks = this.board.at(row, 7);
        if (rks && rks.type === 'rook' && !rks.hasMoved && !this.board.at(row, 5) && !this.board.at(row, 6))
            if (!this.wouldBeInCheck(r, c, row, 5) && !this.wouldBeInCheck(r, c, row, 6))
                m.push({ row, col: 6, castling: 'king' });
        const rqs = this.board.at(row, 0);
        if (rqs && rqs.type === 'rook' && !rqs.hasMoved && !this.board.at(row, 1) && !this.board.at(row, 2) && !this.board.at(row, 3))
            if (!this.wouldBeInCheck(r, c, row, 3) && !this.wouldBeInCheck(r, c, row, 2))
                m.push({ row, col: 2, castling: 'queen' });
        return m;
    }

    makeMove(fromR, fromC, toR, toC, moveInfo = {}, autoPromo = 'queen') {
        this.history.push(this._snapshot());
        const piece = this.board.at(fromR, fromC); if (!piece) return null;
        let captured = this.board.at(toR, toC);
        const result = { piece, captured, fromR, fromC, toR, toC, special: null };
        if (moveInfo.enPassant) { const epR = piece.color === 'white' ? toR + 1 : toR - 1; captured = this.board.at(epR, toC); this.board.clear(epR, toC); result.captured = captured; result.special = 'enPassant'; }
        if (captured) { if (piece.color === 'white') this.capturedByWhite.push(captured); else this.capturedByBlack.push(captured); }
        this.board.set(toR, toC, piece); this.board.clear(fromR, fromC); piece.hasMoved = true;
        this.board.enPassantTarget = null;
        if (piece.type === 'pawn' && Math.abs(toR - fromR) === 2) this.board.enPassantTarget = { row: (fromR + toR) / 2, col: fromC };
        if (moveInfo.castling) {
            result.special = 'castling'; const rf = moveInfo.castling === 'king' ? 7 : 0, rt = moveInfo.castling === 'king' ? toC - 1 : toC + 1;
            const rk = this.board.at(toR, rf); this.board.set(toR, rt, rk); this.board.clear(toR, rf); rk.hasMoved = true; result.rookFrom = rf; result.rookTo = rt;
        }
        const promoRow = piece.color === 'white' ? 0 : 7;
        if (piece.type === 'pawn' && toR === promoRow) {
            if (autoPromo) { const pr = new Piece(piece.color, autoPromo); pr.hasMoved = true; this.board.set(toR, toC, pr); result.special = 'promotion'; }
            else { result.special = 'promotion'; this.pendingPromotion = { row: toR, col: toC }; }
        }
        this.lastMove = { fromRow: fromR, fromCol: fromC, toRow: toR, toCol: toC };
        if (result.special !== 'promotion' || autoPromo) this._endTurn();
        return result;
    }
    promote(type) {
        if (!this.pendingPromotion) return; const { row, col } = this.pendingPromotion; const p = this.board.at(row, col);
        const pr = new Piece(p.color, type); pr.hasMoved = true; this.board.set(row, col, pr); this.pendingPromotion = null; this._endTurn();
    }
    _endTurn() { this.turn = this.turn === 'white' ? 'black' : 'white'; this._updateStatus(); }
    _updateStatus() {
        const ck = this.isInCheck(this.turn), has = this._hasAnyLegal(this.turn);
        if (ck && !has) this.status = 'checkmate'; else if (!ck && !has) this.status = 'stalemate'; else if (ck) this.status = 'check'; else this.status = 'playing';
    }
    _hasAnyLegal(color) {
        const saved = this.turn; this.turn = color;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = this.board.at(r, c);
            if (p && p.color === color && this.legalMoves(r, c).length > 0) { this.turn = saved; return true; }
        }
        this.turn = saved; return false;
    }
}

// ================================================================
//  AI  (minimax + alpha-beta + piece-square tables)
// ================================================================

class AI {
    constructor(depth = 3) { this.depth = depth; }

    // Piece-square tables (positive = good for white)
    static PST = {
        pawn: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5, 5, 10, 25, 25, 10, 5, 5],
            [0, 0, 0, 20, 20, 0, 0, 0],
            [5, -5, -10, 0, 0, -10, -5, 5],
            [5, 10, 10, -20, -20, 10, 10, 5],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ],
        knight: [
            [-50, -40, -30, -30, -30, -30, -40, -50],
            [-40, -20, 0, 0, 0, 0, -20, -40],
            [-30, 0, 10, 15, 15, 10, 0, -30],
            [-30, 5, 15, 20, 20, 15, 5, -30],
            [-30, 0, 15, 20, 20, 15, 0, -30],
            [-30, 5, 10, 15, 15, 10, 5, -30],
            [-40, -20, 0, 5, 5, 0, -20, -40],
            [-50, -40, -30, -30, -30, -30, -40, -50]
        ],
        bishop: [
            [-20, -10, -10, -10, -10, -10, -10, -20],
            [-10, 0, 0, 0, 0, 0, 0, -10],
            [-10, 0, 10, 10, 10, 10, 0, -10],
            [-10, 5, 5, 10, 10, 5, 5, -10],
            [-10, 0, 5, 10, 10, 5, 0, -10],
            [-10, 10, 10, 10, 10, 10, 10, -10],
            [-10, 5, 0, 0, 0, 0, 5, -10],
            [-20, -10, -10, -10, -10, -10, -10, -20]
        ],
        rook: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [5, 10, 10, 10, 10, 10, 10, 5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [-5, 0, 0, 0, 0, 0, 0, -5],
            [0, 0, 0, 5, 5, 0, 0, 0]
        ],
        queen: [
            [-20, -10, -10, -5, -5, -10, -10, -20],
            [-10, 0, 0, 0, 0, 0, 0, -10],
            [-10, 0, 5, 5, 5, 5, 0, -10],
            [-5, 0, 5, 5, 5, 5, 0, -5],
            [0, 0, 5, 5, 5, 5, 0, -5],
            [-10, 5, 5, 5, 5, 5, 0, -10],
            [-10, 0, 5, 0, 0, 0, 0, -10],
            [-20, -10, -10, -5, -5, -10, -10, -20]
        ],
        king: [
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-30, -40, -40, -50, -50, -40, -40, -30],
            [-20, -30, -30, -40, -40, -30, -30, -20],
            [-10, -20, -20, -20, -20, -20, -20, -10],
            [20, 20, 0, 0, 0, 0, 20, 20],
            [20, 30, 10, 0, 0, 10, 30, 20]
        ]
    };

    evaluate(game) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = game.board.at(r, c);
                if (!p) continue;
                const pst = AI.PST[p.type];
                const pstVal = p.color === 'white' ? pst[r][c] : pst[7 - r][c];
                const val = p.value + pstVal;
                score += p.color === 'white' ? val : -val;
            }
        }
        return score;
    }

    bestMove(game) {
        const maximizing = game.turn === 'white';
        const moves = game.allLegalMoves(game.turn);
        if (moves.length === 0) return null;

        // Randomize order for variety
        for (let i = moves.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [moves[i], moves[j]] = [moves[j], moves[i]];
        }

        // Order captures first for better pruning
        moves.sort((a, b) => {
            const capA = game.board.at(a.row, a.col);
            const capB = game.board.at(b.row, b.col);
            return (capB ? capB.value : 0) - (capA ? capA.value : 0);
        });

        let bestScore = maximizing ? -Infinity : Infinity;
        let best = moves[0];

        for (const m of moves) {
            const snapshot = game._snapshot();
            game.makeMove(m.fromR, m.fromC, m.row, m.col, m, 'queen');
            const score = this._minimax(game, this.depth - 1, -Infinity, Infinity, !maximizing);
            // Restore
            const s = game.history.pop();
            game.board = s.grid; game.turn = s.turn;
            game.capturedByWhite = s.capW; game.capturedByBlack = s.capB;
            game.lastMove = s.lastMove; game.board.enPassantTarget = s.ep;
            game.pendingPromotion = null; game.status = 'playing';

            if (maximizing ? score > bestScore : score < bestScore) {
                bestScore = score; best = m;
            }
        }
        return best;
    }

    _minimax(game, depth, alpha, beta, maximizing) {
        if (depth === 0 || game.status === 'checkmate' || game.status === 'stalemate') {
            if (game.status === 'checkmate') return maximizing ? -99999 : 99999;
            if (game.status === 'stalemate') return 0;
            return this.evaluate(game);
        }

        const moves = game.allLegalMoves(game.turn);
        // Move ordering: captures first
        moves.sort((a, b) => {
            const capA = game.board.at(a.row, a.col);
            const capB = game.board.at(b.row, b.col);
            return (capB ? capB.value : 0) - (capA ? capA.value : 0);
        });

        if (maximizing) {
            let maxEval = -Infinity;
            for (const m of moves) {
                game.makeMove(m.fromR, m.fromC, m.row, m.col, m, 'queen');
                const ev = this._minimax(game, depth - 1, alpha, beta, false);
                const s = game.history.pop();
                game.board = s.grid; game.turn = s.turn;
                game.capturedByWhite = s.capW; game.capturedByBlack = s.capB;
                game.lastMove = s.lastMove; game.board.enPassantTarget = s.ep;
                game.pendingPromotion = null; game.status = 'playing';
                game._updateStatus();
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const m of moves) {
                game.makeMove(m.fromR, m.fromC, m.row, m.col, m, 'queen');
                const ev = this._minimax(game, depth - 1, alpha, beta, true);
                const s = game.history.pop();
                game.board = s.grid; game.turn = s.turn;
                game.capturedByWhite = s.capW; game.capturedByBlack = s.capB;
                game.lastMove = s.lastMove; game.board.enPassantTarget = s.ep;
                game.pendingPromotion = null; game.status = 'playing';
                game._updateStatus();
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }
}

// ================================================================
//  SOUND (Web Audio API – no external files)
// ================================================================

class SoundFX {
    constructor() {
        this.ctx = null;
        this.noiseBuffer = null;
        this._initOnInteraction();
    }
    _initOnInteraction() {
        const init = () => {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this._createNoiseBuffer(0.4);
            }
            document.removeEventListener('click', init);
        };
        document.addEventListener('click', init);
    }
    _createNoiseBuffer(dur) {
        if (!this.ctx) return;
        const bs = this.ctx.sampleRate * dur;
        this.noiseBuffer = this.ctx.createBuffer(1, bs, this.ctx.sampleRate);
        const d = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
    }
    _play(freq, type, dur, vol = 0.15) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + dur);
    }
    move() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        // Low frequency thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.15);

        // Click noise
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const nF = this.ctx.createBiquadFilter();
            nF.type = 'highpass'; nF.frequency.value = 800;
            const nG = this.ctx.createGain();
            nG.gain.setValueAtTime(0.2, t);
            nG.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            noise.connect(nF); nF.connect(nG); nG.connect(this.ctx.destination);
            noise.start(t); noise.stop(t + 0.05);
        }
    }
    capture() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        // Sharper, higher initial impact
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.2);

        // Clattering noise
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const nF = this.ctx.createBiquadFilter();
            nF.type = 'bandpass'; nF.frequency.value = 1500;
            const nG = this.ctx.createGain();
            nG.gain.setValueAtTime(0.4, t);
            nG.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            noise.connect(nF); nF.connect(nG); nG.connect(this.ctx.destination);
            noise.start(t); noise.stop(t + 0.15);
        }
    }
    check() { this._play(660, 'sawtooth', 0.15, 0.12); setTimeout(() => this._play(880, 'sawtooth', 0.2, 0.1), 100); }
    checkmate() { this._play(220, 'sawtooth', 0.3, 0.15); setTimeout(() => this._play(165, 'sawtooth', 0.4, 0.12), 200); setTimeout(() => this._play(131, 'sawtooth', 0.5, 0.1), 400); }
    select() { this._play(660, 'sine', 0.05, 0.04); }
    illegal() { this._play(150, 'square', 0.15, 0.1); }
    castle() { this.move(); setTimeout(() => this.move(), 100); }
}

// ================================================================
//  PARTICLES
// ================================================================

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.animating = false;
    }
    resize(w, h) { this.canvas.width = w; this.canvas.height = h; }

    burst(x, y, color) {
        const hues = color === 'white'
            ? ['#fff', '#e0e0e0', '#ffd54f', '#b39ddb']
            : ['#555', '#333', '#7c6df0', '#ef5350'];
        for (let i = 0; i < 28; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                life: 1,
                decay: 0.015 + Math.random() * 0.02,
                size: 2 + Math.random() * 4,
                color: hues[Math.floor(Math.random() * hues.length)],
                gravity: 0.06 + Math.random() * 0.04
            });
        }
        if (!this.animating) this._animate();
    }

    _animate() {
        this.animating = true;
        const loop = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
                p.life -= p.decay;
                if (p.life <= 0) { this.particles.splice(i, 1); continue; }
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.globalAlpha = 1;
            if (this.particles.length > 0) requestAnimationFrame(loop);
            else this.animating = false;
        };
        requestAnimationFrame(loop);
    }
}

// ================================================================
//  UI CONTROLLER
// ================================================================

const AI_LEVELS = [
    { name: "Very Easy", depth: 1 },
    { name: "Easy", depth: 1 },
    { name: "Novice", depth: 2 },
    { name: "Normal", depth: 2 },
    { name: "Intermediate", depth: 3 },
    { name: "Advanced", depth: 3 },
    { name: "Hard", depth: 4 },
    { name: "Very Hard", depth: 4 },
    { name: "Expert", depth: 5 },
    { name: "Candidate", depth: 6 }
];

class ChessUI {
    constructor() {
        this.game = new Game();
        this.ai = null;
        this.aiColor = 'black';
        this.playerColor = 'white';
        this.mode = 'pvp';
        this.aiDepth = 3;
        this.sound = new SoundFX();
        this.selectedSquare = null;
        this.legalMovesCache = [];
        this.activeHintBoxes = null;
        this.isAiThinking = false;
        this.taskLevel = parseInt(localStorage.getItem('chess_taskLevel')) || 1;
        this.taskMoves = [];
        this.aiProgLevel = parseInt(localStorage.getItem('chess_aiProgLevel')) || 1;

        // Settings State
        this.prefs = JSON.parse(localStorage.getItem('chess_prefs')) || {
            sound: true,
            highlights: true,
            particles: true
        };

        this.peer = null;
        this.conn = null;
        this.isHost = false;

        // DOM
        this.menuOverlay = document.getElementById('menu-overlay');
        this.gameScreen = document.getElementById('game-screen');
        this.boardEl = document.getElementById('board');
        this.turnEl = document.getElementById('turn-indicator');
        this.statusEl = document.getElementById('game-status');
        this.capWhiteEl = document.getElementById('captured-by-white');
        this.capBlackEl = document.getElementById('captured-by-black');
        this.promoOverlay = document.getElementById('promotion-overlay');
        this.promoChoices = document.getElementById('promotion-choices');
        this.modeBadge = document.getElementById('mode-badge');
        this.whiteDot = document.getElementById('white-dot');
        this.blackDot = document.getElementById('black-dot');
        this.whiteLabel = document.getElementById('white-label');
        this.blackLabel = document.getElementById('black-label');
        this.boardWrapper = document.getElementById('board-wrapper');
        this.particleCanvas = document.getElementById('particle-canvas');
        this.particles = new ParticleSystem(this.particleCanvas);
        this.aiSettingsEl = document.getElementById('ai-settings');

        this._bindMenu();
        this._bindGame();
        this._buildBoard();
        this._buildFileLabels();

        // Resume if saved
        this._loadSavedGame();
    }

    // ---- Menu bindings ----
    _bindMenu() {
        document.getElementById('btn-pvp').addEventListener('click', () => {
            this.mode = 'pvp'; this.ai = null;
            this.aiSettingsEl.classList.add('hidden');
            this._startGame();
        });
        document.getElementById('btn-ai').addEventListener('click', () => {
            this.aiSettingsEl.classList.toggle('hidden');
        });
        document.getElementById('btn-task').addEventListener('click', () => {
            this.mode = 'task'; this.ai = null;
            this.aiSettingsEl.classList.add('hidden');
            this.taskLevel = 1;
            this._startTaskMode();
        });
        document.getElementById('btn-settings-menu').addEventListener('click', () => this._showSettings());
        document.getElementById('settings-btn').addEventListener('click', () => this._showSettings());
        document.getElementById('close-settings-btn').addEventListener('click', () => {
            document.getElementById('settings-overlay').classList.add('hidden');
        });

        // Settings Checkboxes
        document.getElementById('setting-sound').addEventListener('change', (e) => this._updatePref('sound', e.target.checked));
        document.getElementById('setting-highlights').addEventListener('change', (e) => this._updatePref('highlights', e.target.checked));
        document.getElementById('setting-particles').addEventListener('change', (e) => this._updatePref('particles', e.target.checked));

        // Controls (Permissions)
        document.getElementById('btn-unlock-all').addEventListener('click', () => {
            this.taskLevel = 10;
            this.aiProgLevel = 10;
            localStorage.setItem('chess_taskLevel', 10);
            localStorage.setItem('chess_aiProgLevel', 10);
            alert("All levels unlocked! You now have full permission to access any level.");
        });
        document.getElementById('btn-reset-data').addEventListener('click', () => {
            if (confirm("Are you sure you want to reset all progress and settings?")) {
                localStorage.clear();
                location.reload();
            }
        });

        document.getElementById('quit-btn').addEventListener('click', () => this._quitGame());
        document.getElementById('back-from-online').addEventListener('click', () => {
            document.getElementById('online-overlay').classList.add('hidden');
        });

        document.getElementById('btn-online').addEventListener('click', () => this._openOnlineLobby());
        document.getElementById('btn-ai-prog').addEventListener('click', () => {
            this.aiSettingsEl.classList.toggle('hidden');
            this.mode = 'ai-prog';
        });
        document.getElementById('close-online-btn').addEventListener('click', () => {
            document.getElementById('online-overlay').classList.add('hidden');
        });
        document.getElementById('btn-copy-id').addEventListener('click', () => {
            navigator.clipboard.writeText(this.peer ? this.peer.id : '');
            document.getElementById('btn-copy-id').textContent = 'Copied!';
            setTimeout(() => document.getElementById('btn-copy-id').textContent = 'Copy', 2000);
        });
        document.getElementById('btn-join-friend').addEventListener('click', () => {
            const target = document.getElementById('friend-id-input').value.trim();
            if (target) this._connectToPeer(target);
        });
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.aiDepth = parseInt(btn.dataset.depth);
            });
        });
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.playerColor = btn.dataset.color;
                this.aiColor = this.playerColor === 'white' ? 'black' : 'white';
            });
        });
        document.getElementById('btn-start-ai').addEventListener('click', () => {
            if (this.mode === 'ai-prog') {
                this._startAiProgMode();
            } else {
                this.mode = 'ai';
                this.ai = new AI(this.aiDepth);
                this.aiColor = this.playerColor === 'white' ? 'black' : 'white';
                this._startGame();
            }
        });
    }

    _bindGame() {
        document.getElementById('reset-btn').addEventListener('click', () => this._restartGame());
        document.getElementById('undo-btn').addEventListener('click', () => this._undo());
        document.getElementById('quit-btn').addEventListener('click', () => this._quitGame());
        document.getElementById('hint-btn').addEventListener('click', () => this._showHint());
    }

    _autoSave() {
        const savedState = {
            game: this.game.toJSON(),
            mode: this.mode,
            playerColor: this.playerColor,
            aiDepth: this.aiDepth,
            taskLevel: this.taskLevel,
            taskMoves: this.taskMoves,
            aiProgLevel: this.aiProgLevel,
            prefs: this.prefs
        };
        localStorage.setItem('chess_save', JSON.stringify(savedState));
    }

    _loadSavedGame() {
        const savedState = localStorage.getItem('chess_save');
        if (!savedState) return false;

        const data = JSON.parse(savedState);
        this.game = Game.fromJSON(data.game);
        this.mode = data.mode;
        this.playerColor = data.playerColor;
        this.aiDepth = data.aiDepth;
        this.taskLevel = data.taskLevel;
        this.taskMoves = data.taskMoves || [];
        this.aiProgLevel = data.aiProgLevel;
        this.prefs = data.prefs;

        if (this.mode === 'ai' || this.mode === 'ai-prog') {
            this.ai = new AI(this.aiDepth);
            this.aiColor = this.playerColor === 'white' ? 'black' : 'white';
        } else {
            this.ai = null;
        }

        this.selectedSquare = null;
        this.legalMovesCache = [];
        this.promoOverlay.classList.add('hidden');
        this.menuOverlay.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.modeBadge.textContent = this.mode === 'pvp' ? 'PvP' : `AI ${['', 'Easy', '', 'Med', 'Hard'][this.aiDepth]}`;
        this.whiteLabel.textContent = this.mode === 'ai' && this.aiColor === 'white' ? 'AI' : 'Player 1';
        this.blackLabel.textContent = this.mode === 'ai' && this.aiColor === 'black' ? 'AI' : 'Player 2';
        this._resizeParticles();
        this.render();

        if (this.mode === 'ai' && this.game.turn === this.aiColor) {
            setTimeout(() => this._aiMove(), 400);
        }
        return true;
    }

    _startGame() {
        this.game.reset();
        this.selectedSquare = null;
        this.legalMovesCache = [];
        this.promoOverlay.classList.add('hidden');
        this.menuOverlay.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.modeBadge.textContent = this.mode === 'pvp' ? 'PvP' : `AI ${['', 'Easy', '', 'Med', 'Hard'][this.aiDepth]}`;
        this.whiteLabel.textContent = this.mode === 'ai' && this.aiColor === 'white' ? 'AI' : 'Player 1';
        this.blackLabel.textContent = this.mode === 'ai' && this.aiColor === 'black' ? 'AI' : 'Player 2';
        this._resizeParticles();
        this.render();
        // If AI plays white, make its move
        if (this.mode === 'ai' && this.aiColor === 'white') {
            setTimeout(() => this._aiMove(), 400);
        }
    }

    _restartGame() {
        this.game.reset();
        this.selectedSquare = null;
        this.legalMovesCache = [];
        this._autoSave();
        this.isAiThinking = false;
        this.promoOverlay.classList.add('hidden');
        this.render();
        if (this.mode === 'ai' && this.aiColor === 'white') {
            setTimeout(() => this._aiMove(), 400);
        }
    }

    _showMenu() {
        this.gameScreen.classList.add('hidden');
        this.menuOverlay.classList.remove('hidden');
        this.menuOverlay.style.animation = 'none';
        void this.menuOverlay.offsetWidth;
        this.menuOverlay.style.animation = '';
        this.aiSettingsEl.classList.add('hidden');
    }

    _showSettings() {
        // Sync checkboxes with state
        document.getElementById('setting-sound').checked = this.prefs.sound;
        document.getElementById('setting-highlights').checked = this.prefs.highlights;
        document.getElementById('setting-particles').checked = this.prefs.particles;
        document.getElementById('settings-overlay').classList.remove('hidden');
    }

    _updatePref(key, val) {
        this.prefs[key] = val;
        localStorage.setItem('chess_prefs', JSON.stringify(this.prefs));
        if (key === 'sound') this.sound.muted = !val;
        this.render();
    }

    _quitGame() {
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.game.reset();
        this._showMenu();
    }

    _undo() {
        if (this.isAiThinking) return;
        // In AI mode, undo twice (AI move + player move)
        if (this.mode === 'ai') {
            this.game.undo();
            this.game.undo();
        } else {
            this.game.undo();
        }
        this.selectedSquare = null;
        this.legalMovesCache = [];
        this._autoSave();
        this.render();
    }

    _resizeParticles() {
        const rect = this.boardWrapper.getBoundingClientRect();
        this.particles.resize(rect.width, rect.height);
    }

    // ---- Board building ----
    _buildBoard() {
        this.boardEl.innerHTML = '';
        this.squareEls = [];
        for (let r = 0; r < 8; r++) {
            const row = [];
            for (let c = 0; c < 8; c++) {
                const sq = document.createElement('div');
                sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
                sq.dataset.row = r; sq.dataset.col = c;
                sq.id = `sq-${r}-${c}`;
                sq.addEventListener('click', () => this._onSquareClick(r, c));
                this.boardEl.appendChild(sq);
                row.push(sq);
            }
            this.squareEls.push(row);
        }
    }

    _buildFileLabels() {
        const container = document.getElementById('coord-files');
        container.innerHTML = '';
        for (let c = 0; c < 8; c++) {
            const s = document.createElement('span');
            s.textContent = 'abcdefgh'[c];
            container.appendChild(s);
        }
    }

    // ---- Interaction ----
    _onSquareClick(r, c) {
        this._clearHints();
        if (this.game.status === 'checkmate' || this.game.status === 'stalemate') return;
        if (this.game.pendingPromotion) return;
        if (this.isAiThinking) return;
        if (this.mode === 'ai' && this.game.turn === this.aiColor) return;
        if (this.mode === 'task' && this.game.turn === this.aiColor) return;
        if (this.mode === 'online' && this.game.turn !== this.playerColor) return;

        const piece = this.game.board.at(r, c);

        if (this.selectedSquare) {
            const { row: sr, col: sc } = this.selectedSquare;
            if (sr === r && sc === c) { this._deselect(); return; }
            if (piece && piece.color === this.game.turn) { this._select(r, c); return; }

            const moveInfo = this.legalMovesCache.find(m => m.row === r && m.col === c);
            if (moveInfo) {
                this._executeMove(sr, sc, r, c, moveInfo);
            } else {
                this.sound.illegal();
                this._deselect();
            }
            return;
        }

        if (piece && piece.color === this.game.turn) {
            this._select(r, c);
        }
    }

    _select(r, c) {
        this.selectedSquare = { row: r, col: c };
        this.legalMovesCache = this.prefs.highlights ? this.game.legalMoves(r, c) : [];
        if (this.prefs.sound) this.sound.select();
        this.render();
    }

    _deselect() {
        this.selectedSquare = null;
        this.legalMovesCache = [];
        this.render();
    }

    _executeMove(fromR, fromC, toR, toC, moveInfo) {
        const captured = this.game.board.at(toR, toC) || (moveInfo.enPassant ? true : false);

        const result = this.game.makeMove(fromR, fromC, toR, toC, moveInfo, null);
        this._deselect();

        if (result) {
            if (this.prefs.sound) {
                if (result.special === 'castling') this.sound.castle();
                else if (result.captured) this.sound.capture();
                else this.sound.move();
            }

            if (result.captured && this.prefs.particles) {
                this._spawnParticles(toR, toC, result.captured.color);
            }

            if (result.special === 'promotion' && this.game.pendingPromotion) {
                this.render();
                this._showPromotionModal();
                return;
            }

            if (this.game.status === 'checkmate') {
                if (this.prefs.sound) this.sound.checkmate();
                if (this.mode === 'ai-prog' && this.game.turn !== this.playerColor) {
                    // Player won AI progression game
                    setTimeout(() => {
                        this.aiProgLevel++;
                        localStorage.setItem('chess_aiProgLevel', this.aiProgLevel);
                        if (this.aiProgLevel > AI_LEVELS.length) {
                            alert("Congratulations! You are a Chess Master (Candidate Level defeated)!");
                            this._showMenu();
                        } else {
                            if (confirm(`Level ${this.aiProgLevel - 1} Defeated! Proceed to Level ${this.aiProgLevel} (${AI_LEVELS[this.aiProgLevel - 1].name})?`)) {
                                this._startAiProgMode();
                            }
                        }
                    }, 2000);
                }
            }
            else if (this.game.status === 'check' && this.prefs.sound) this.sound.check();

            // Task Mode validation
            if (this.mode === 'task') {
                this._validateTaskMove(fromR, fromC, toR, toC);
            }

            if (this.mode === 'online') {
                if (this.conn && this.conn.open && this.game.turn !== this.playerColor) {
                    this.conn.send({ type: 'move', fromR, fromC, toR, toC });
                }
            }
        }

        this._autoSave(); // Added _autoSave here
        this.render();

        // AI move
        if (this.mode === 'ai' && this.game.turn === this.aiColor &&
            this.game.status !== 'checkmate' && this.game.status !== 'stalemate') {
            setTimeout(() => this._aiMove(), 350);
        }
    }

    _spawnParticles(r, c) {
        const sq = this.squareEls[r][c];
        const boardRect = this.boardWrapper.getBoundingClientRect();
        const sqRect = sq.getBoundingClientRect();
        const x = sqRect.left - boardRect.left + sqRect.width / 2;
        const y = sqRect.top - boardRect.top + sqRect.height / 2;
        const capturedPiece = this.game.board.at(r, c);
        const color = capturedPiece ? capturedPiece.color : 'white';
        this.particles.burst(x, y, color);
    }

    // ---- AI ----
    _aiMove() {
        if (this.game.status === 'checkmate' || this.game.status === 'stalemate') return;
        this.isAiThinking = true;
        this.render();

        // Use setTimeout to let UI update
        setTimeout(() => {
            const move = this.ai.bestMove(this.game);
            this.isAiThinking = false;
            if (move) {
                const captured = this.game.board.at(move.row, move.col);
                const result = this.game.makeMove(move.fromR, move.fromC, move.row, move.col, move, 'queen');
                if (result) {
                    if (result.special === 'castling') this.sound.castle();
                    else if (result.captured) this.sound.capture();
                    else this.sound.move();
                    if (result.captured) {
                        // Delay particles slightly so board renders first
                        setTimeout(() => {
                            this._spawnCaptureParticles(move.row, move.col, result.captured.color);
                        }, 50);
                    }
                    if (this.game.status === 'checkmate') this.sound.checkmate();
                    else if (this.game.status === 'check') this.sound.check();
                }
            }
            this._autoSave(); // Added _autoSave here
            this.render();
        }, 50);
    }

    _spawnCaptureParticles(r, c, color) {
        const sq = this.squareEls[r][c];
        const boardRect = this.boardWrapper.getBoundingClientRect();
        const sqRect = sq.getBoundingClientRect();
        const x = sqRect.left - boardRect.left + sqRect.width / 2;
        const y = sqRect.top - boardRect.top + sqRect.height / 2;
        this.particles.burst(x, y, color);
    }

    _spawnWinParticles() {
        const rect = this.boardWrapper.getBoundingClientRect();
        const w = rect.width, h = rect.height;
        // Burst from corners
        this.particles.burst(w * 0.2, h * 0.2, 'white');
        this.particles.burst(w * 0.8, h * 0.2, 'white');
        this.particles.burst(w * 0.2, h * 0.8, 'white');
        this.particles.burst(w * 0.8, h * 0.8, 'white');
    }

    _taskOpponentReply() {
        if (this.taskMoves.length === 0) return;
        const uci = this.taskMoves.shift();
        const fromC = uci.charCodeAt(0) - 97;
        const fromR = 8 - parseInt(uci[1]);
        const toC = uci.charCodeAt(2) - 97;
        const toR = 8 - parseInt(uci[3]);

        // Find legal move matching coordinates
        let moveInfo = this.game.legalMoves(fromR, fromC).find(m => m.row === toR && m.col === toC);
        if (!moveInfo) moveInfo = { row: toR, col: toC }; // fallback if castling/ep logic missed it

        const result = this.game.makeMove(fromR, fromC, toR, toC, moveInfo, 'queen');
        if (result) {
            if (result.special === 'castling') this.sound.castle();
            else if (result.captured) this.sound.capture();
            else this.sound.move();

            if (result.captured) {
                setTimeout(() => this._spawnCaptureParticles(toR, toC, result.captured.color), 50);
            }
        }

        this.render();

        if (this.taskMoves.length === 0) {
            this.sound.checkmate();
            setTimeout(() => {
                this.taskLevel++;
                this._startTaskMode();
            }, 1200);
        }
    }

    // ---- Promotion ----
    _showPromotionModal() {
        this.promoOverlay.classList.remove('hidden');
        this.promoChoices.innerHTML = '';
        const color = this.game.turn;
        for (const t of ['queen', 'rook', 'bishop', 'knight']) {
            const btn = document.createElement('div');
            btn.className = 'promo-option';
            btn.textContent = Piece.SYMBOLS[color][t];
            btn.addEventListener('click', () => {
                this.game.promote(t);
                this.promoOverlay.classList.add('hidden');
                if (this.prefs.sound) {
                    this.sound.move();
                    if (this.game.status === 'checkmate') this.sound.checkmate();
                    else if (this.game.status === 'check') this.sound.check();
                }
                this.render();

                if (this.mode === 'task') {
                    // Get the last move and validate
                    const lm = this.game.lastMove;
                    this._validateTaskMove(lm.fromRow, lm.fromCol, lm.toRow, lm.toCol);
                }

                if (this.mode === 'ai' && this.game.turn === this.aiColor) {
                    setTimeout(() => this._aiMove(), 350);
                }
                this._autoSave();
            });
            this.promoChoices.appendChild(btn);
        }
    }

    _startTaskMode() {
        if (!window.PUZZLES || window.PUZZLES.length === 0) return;
        this.isAiThinking = false;
        const pIdx = (this.taskLevel - 1) % window.PUZZLES.length;
        const puzzle = window.PUZZLES[pIdx];
        this.game.loadFEN(puzzle.fen);
        this.taskMoves = [...puzzle.moves];
        localStorage.setItem('chess_taskLevel', this.taskLevel);

        this.selectedSquare = null;
        this.legalMovesCache = [];
        this.promoOverlay.classList.add('hidden');
        this.menuOverlay.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');

        this.modeBadge.textContent = `Task Lvl ${this.taskLevel} - ${puzzle.difficulty}`;

        this.playerColor = this.game.turn;
        this.aiColor = this.playerColor === 'white' ? 'black' : 'white';

        this.whiteLabel.textContent = this.playerColor === 'white' ? 'You' : 'Puzzle';
        this.blackLabel.textContent = this.playerColor === 'black' ? 'You' : 'Puzzle';

        this._resizeParticles();
        this.render();
    }

    _validateTaskMove(fromR, fromC, toR, toC) {
        if (this.game.turn !== this.aiColor) return;
        const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const uciMove = cols[fromC] + (8 - fromR) + cols[toC] + (8 - toR);
        if (this.taskMoves[0] && this.taskMoves[0].startsWith(uciMove)) {
            this.taskMoves.shift(); // remove player move
            if (this.taskMoves.length === 0) {
                this.sound.checkmate();
                this._spawnWinParticles();
                setTimeout(() => {
                    this.taskLevel++;
                    this._autoSave();
                    if (this.taskLevel > window.PUZZLES.length) {
                        alert("🎉 Amazing! You've completed all tactical puzzles!");
                        this._showMenu();
                    } else {
                        alert(`Puzzle Level ${this.taskLevel - 1} Solved! Passing to next...`);
                        this._startTaskMode();
                    }
                }, 1000);
            } else {
                setTimeout(() => this._taskOpponentReply(), 600);
            }
        } else {
            this.sound.illegal();
            setTimeout(() => {
                this.game.undo();
                this.render();
            }, 400);
        }
    }

    _startAiProgMode() {
        this.isAiThinking = false;
        const levelData = AI_LEVELS[this.aiProgLevel - 1];

        // STRICT DIFFICULTY: AI depth is locked to level
        const depth = levelData.depth; // Already defined in AI_LEVELS
        this.ai = new AI(depth);

        this.mode = 'ai-prog';
        // playerColor and aiColor already set by UI choice or default

        const difficultyName = levelData.name;
        this.game.reset();
        this.selectedSquare = null;
        this.legalMovesCache = [];
        this.promoOverlay.classList.add('hidden');
        this.menuOverlay.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.modeBadge.textContent = `AI Level ${this.aiProgLevel} - ${difficultyName}`;

        this.whiteLabel.textContent = this.playerColor === 'white' ? 'You' : 'AI';
        this.blackLabel.textContent = this.playerColor === 'black' ? 'You' : 'AI';

        this._resizeParticles();
        this._autoSave();
        this.render();

        if (this.playerColor === 'black') {
            setTimeout(() => this._aiMove(), 500);
        }
    }

    _showHint() {
        if (this.game.status === 'checkmate' || this.game.status === 'stalemate' || this.isAiThinking) return;
        if (this.mode === 'ai' && this.game.turn === this.aiColor) return;

        this._clearHints();

        // Calculate best move using AI (depth 3 is fast enough)
        const hintAi = new AI(3);
        const move = hintAi.bestMove(this.game);

        if (move) {
            const fromSq = document.getElementById(`sq-${move.fromR}-${move.fromC}`);
            const toSq = document.getElementById(`sq-${move.row}-${move.col}`);
            if (fromSq) fromSq.classList.add('hint-square');
            if (toSq) toSq.classList.add('hint-square');
            this.activeHintBoxes = [fromSq, toSq];
        } else {
            this.sound.illegal();
        }
    }

    _clearHints() {
        if (this.activeHintBoxes) {
            this.activeHintBoxes.forEach(el => el && el.classList.remove('hint-square'));
            this.activeHintBoxes = null;
        }
    }

    // ---- Online Multiplayer ----
    _openOnlineLobby() {
        document.getElementById('online-overlay').classList.remove('hidden');
        document.getElementById('online-status').textContent = '';
        if (!this.peer) {
            this.peer = new Peer();
            this.peer.on('open', id => document.getElementById('my-peer-id').textContent = id);
            this.peer.on('connection', conn => {
                this.isHost = true;
                this._setupConnection(conn);
            });
        }
    }

    _connectToPeer(targetId) {
        document.getElementById('online-status').textContent = "Connecting...";
        const conn = this.peer.connect(targetId);
        this.isHost = false;
        this._setupConnection(conn);
    }

    _setupConnection(conn) {
        this.conn = conn;
        this.conn.on('open', () => {
            document.getElementById('online-status').textContent = "Connected! Starting game...";
            setTimeout(() => {
                document.getElementById('online-overlay').classList.add('hidden');
                this._startOnlineGame();
            }, 1000);
        });
        this.conn.on('data', data => {
            if (data.type === 'move') {
                let moveInfo = this.game.legalMoves(data.fromR, data.fromC).find(m => m.row === data.toR && m.col === data.toC);
                if (!moveInfo) moveInfo = { row: data.toR, col: data.toC };

                const result = this.game.makeMove(data.fromR, data.fromC, data.toR, data.toC, moveInfo, 'queen');
                if (result) {
                    if (result.special === 'castling') this.sound.castle();
                    else if (result.captured) this.sound.capture();
                    else this.sound.move();
                    if (result.captured) setTimeout(() => this._spawnCaptureParticles(data.toR, data.toC, result.captured.color), 50);
                    if (this.game.status === 'checkmate') this.sound.checkmate();
                    else if (this.game.status === 'check') this.sound.check();
                }
                this.render();
            }
        });
        this.conn.on('close', () => {
            alert("Opponent disconnected.");
            this._showMenu();
        });
    }

    _startOnlineGame() {
        this.mode = 'online'; this.ai = null;
        this.game.reset();
        this.selectedSquare = null;
        this.legalMovesCache = [];

        this.playerColor = this.isHost ? 'white' : 'black';
        this.aiColor = null;

        this.promoOverlay.classList.add('hidden');
        this.menuOverlay.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.modeBadge.textContent = 'Online Multiplayer';

        this.whiteLabel.textContent = this.playerColor === 'white' ? 'You' : 'Opponent';
        this.blackLabel.textContent = this.playerColor === 'black' ? 'You' : 'Opponent';

        this._resizeParticles();
        this.render();
    }

    // ---- Render ----
    render() {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = this.squareEls[r][c];
                const piece = this.game.board.at(r, c);

                sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

                if (this.game.lastMove) {
                    const lm = this.game.lastMove;
                    if (r === lm.fromRow && c === lm.fromCol) sq.classList.add('last-from');
                    if (r === lm.toRow && c === lm.toCol) sq.classList.add('last-to');
                }

                if (this.selectedSquare && r === this.selectedSquare.row && c === this.selectedSquare.col)
                    sq.classList.add('selected');

                const isLegal = this.legalMovesCache.find(m => m.row === r && m.col === c);
                if (isLegal) {
                    sq.classList.add(piece ? 'legal-capture' : 'legal-move');
                }

                if (piece && piece.type === 'king' &&
                    (this.game.status === 'check' || this.game.status === 'checkmate') &&
                    piece.color === this.game.turn)
                    sq.classList.add('in-check');

                sq.innerHTML = piece
                    ? `<span class="piece ${piece.color}">${piece.symbol}</span>`
                    : '';
            }
        }

        // Turn indicator
        this.turnEl.textContent = this.game.turn === 'white' ? "White's Turn" : "Black's Turn";
        this.turnEl.className = this.game.turn === 'white' ? '' : 'black';

        // AI thinking state
        if (this.isAiThinking) {
            document.body.classList.add('ai-thinking');
        } else {
            document.body.classList.remove('ai-thinking');
        }

        // Turn dots
        this.whiteDot.classList.toggle('active', this.game.turn === 'white');
        this.blackDot.classList.toggle('active', this.game.turn === 'black');

        // Status
        this.statusEl.className = '';
        switch (this.game.status) {
            case 'check':
                this.statusEl.textContent = 'Check!';
                this.statusEl.classList.add('check');
                break;
            case 'checkmate': {
                const winner = this.game.turn === 'white' ? 'Black' : 'White';
                this.statusEl.textContent = `Checkmate — ${winner} wins!`;
                this.statusEl.classList.add('checkmate');
                break;
            }
            case 'stalemate':
                this.statusEl.textContent = 'Stalemate — Draw!';
                this.statusEl.classList.add('stalemate');
                break;
            default:
                this.statusEl.textContent = '';
        }

        // Captured pieces
        this._renderCaptured(this.capWhiteEl, this.game.capturedByWhite);
        this._renderCaptured(this.capBlackEl, this.game.capturedByBlack);
    }

    _renderCaptured(el, pieces) {
        const sorted = [...pieces].sort((a, b) => b.value - a.value);
        el.innerHTML = sorted.map(p => `<span class="cap-piece">${p.symbol}</span>`).join('');
    }
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => { window.chessApp = new ChessUI(); });
