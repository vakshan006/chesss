const PUZZLES = [
    { difficulty: "Very Easy", fen: "1k6/6R1/1K6/8/8/8/8/8 w - - 0 1", moves: ["g7g8"] },
    { difficulty: "Easy", fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1", moves: ["h5f7"] },
    { difficulty: "Novice", fen: "4r1k1/5ppp/8/8/8/8/5PPP/Q3R1K1 w - - 0 1", moves: ["q1e8"] },
    { difficulty: "Normal", fen: "r1b2rk1/pp1p1ppp/2p5/q3P3/2B5/2P2Q2/P1P2PPP/R3R1K1 w - - 0 1", moves: ["f3f7", "f8f7", "e1e8"] },
    { difficulty: "Intermediate", fen: "r1bqr1k1/ppp2ppp/2p5/8/2B1n3/2P2Q2/P1P2PPP/R1B1R1K1 w - - 0 1", moves: ["f3f7", "g8h8", "f7e8", "d8e8", "e1e8"] },
    { difficulty: "Advanced", fen: "1r3rk1/p1p2ppp/3p1q2/2p5/4P1b1/2P1Q3/PP3PPP/RN3RK1 b - - 0 1", moves: ["b8b2"] },
    { difficulty: "Hard", fen: "2r2rk1/1p1b1ppp/p1n1p3/3p4/2PP4/1P1B1N2/P4PPP/2R2RK1 w - - 0 1", moves: ["d3h7", "g8h7", "c1c6"] },
    { difficulty: "Very Hard", fen: "3r2k1/1p3ppp/pb2p3/4P3/1P1P4/P1R1B1P1/5P1P/6K1 w - - 0 1", moves: ["d4d5", "e6d5", "e3b6"] },
    { difficulty: "Expert", fen: "4r1k1/pp3ppp/2p2q2/3p4/3P1n2/2P2Q2/PP1N1PPP/R5K1 b - - 0 1", moves: ["f4e2", "g1f1", "f6f3", "g2f3"] },
    { difficulty: "Candidate", fen: "8/8/4k1p1/2p1p2p/p1P1P2P/P3K1P1/8/8 w - - 0 1", moves: ["e3d3", "e6d6", "d3c3", "d6c6", "c3b2", "c6b6", "b2a2", "b6a6", "g3g4"] },
    // Adding more puzzles to reach a solid set
    { difficulty: "Advanced", fen: "r2q1rk1/1p1b1ppp/p1n1p3/3p4/2PP4/1P1B1N2/P4PPP/2RQ1RK1 w - - 0 1", moves: ["d3h7", "g8h7", "f3g5", "h7g8", "d1h5"] },
    { difficulty: "Intermediate", fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5", moves: ["c3b4"] },
    { difficulty: "Normal", fen: "2kr3r/pppq1ppp/2n1bn2/bB1pp3/P3P3/2PP1N2/1P1N1PPP/R1BQK2R w KQ - 3 10", moves: ["f3e5"] }
];
window.PUZZLES = PUZZLES;
