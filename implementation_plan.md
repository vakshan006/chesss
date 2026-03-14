# 2D Chess Game

Build a fully playable browser-based chess game in a single-page web app (HTML + CSS + JS). The game implements all official chess rules with a modern, premium UI.

## Proposed Changes

### Application (3 files in `d:\viru`)

#### [NEW] [index.html](file:///d:/viru/index.html)
Entry point. Contains the board container, turn indicator, captured pieces panels, check/checkmate status, and reset button. Links to `style.css` and `chess.js`.

#### [NEW] [style.css](file:///d:/viru/style.css)
Premium dark-theme styling: gradient background, alternating board squares, piece animations, glow highlights for selected/legal moves, captured pieces tray, responsive layout, Google Font (Inter).

#### [NEW] [chess.js](file:///d:/viru/chess.js)
OOP architecture with these classes:

| Class | Responsibility |
|-------|---------------|
| `Piece` (+ subclasses: `King`, `Queen`, `Rook`, `Bishop`, `Knight`, `Pawn`) | Legal move generation per piece type |
| `Board` | 8×8 grid, piece placement, move execution, undo |
| `Game` | Turn management, check/checkmate/stalemate detection, en passant, castling, pawn promotion |
| `UI` | Rendering, click-to-move, highlights, animations, captured pieces display |

**Chess rules implemented:** all standard piece moves, castling (king-side & queen-side), en passant, pawn promotion (auto-queen), check detection, checkmate, stalemate, preventing moves that leave own king in check.

## Verification Plan

### Browser Testing
- Open `index.html` in browser via the browser tool
- Verify board renders correctly with all 32 pieces in starting positions
- Test piece selection highlights legal moves
- Test a few standard moves, captures, and special rules (castling, en passant)
- Verify check/checkmate detection and game-over state
- Test the reset button
