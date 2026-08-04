package com.lld.tictactoe.strategy;

import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.model.Symbol;

public class MinimaxAIMoveStrategy implements AIMoveStrategy {

    @Override
    public int[] findBestMove(Game game) {
        String[][] board = copyBoard(game.getBoard());
        Symbol aiSymbol = game.getCurrentTurn().getSymbol();
        Symbol humanSymbol = (aiSymbol == Symbol.X) ? Symbol.O : Symbol.X;

        int bestScore = Integer.MIN_VALUE;
        int[] bestMove = null;

        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                if (board[r][c].isEmpty()) {
                    board[r][c] = aiSymbol.name();
                    int score = minimax(board, 0, false, aiSymbol, humanSymbol);
                    board[r][c] = "";
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = new int[]{r, c};
                    }
                }
            }
        }
        return bestMove;
    }

    private int minimax(String[][] board, int depth, boolean isMaximizing, Symbol aiSymbol, Symbol humanSymbol) {
        String winner = checkWinner(board);
        if (winner != null) {
            if (winner.equals(aiSymbol.name())) return 10 - depth;
            if (winner.equals(humanSymbol.name())) return depth - 10;
            if (winner.equals("DRAW")) return 0;
        }

        if (isMaximizing) {
            int maxEval = Integer.MIN_VALUE;
            for (int r = 0; r < 3; r++) {
                for (int c = 0; c < 3; c++) {
                    if (board[r][c].isEmpty()) {
                        board[r][c] = aiSymbol.name();
                        int eval = minimax(board, depth + 1, false, aiSymbol, humanSymbol);
                        board[r][c] = "";
                        maxEval = Math.max(maxEval, eval);
                    }
                }
            }
            return maxEval;
        } else {
            int minEval = Integer.MAX_VALUE;
            for (int r = 0; r < 3; r++) {
                for (int c = 0; c < 3; c++) {
                    if (board[r][c].isEmpty()) {
                        board[r][c] = humanSymbol.name();
                        int eval = minimax(board, depth + 1, true, aiSymbol, humanSymbol);
                        board[r][c] = "";
                        minEval = Math.min(minEval, eval);
                    }
                }
            }
            return minEval;
        }
    }

    private String checkWinner(String[][] board) {
        for (int i = 0; i < 3; i++) {
            if (!board[i][0].isEmpty() && board[i][0].equals(board[i][1]) && board[i][1].equals(board[i][2])) {
                return board[i][0];
            }
            if (!board[0][i].isEmpty() && board[0][i].equals(board[1][i]) && board[1][i].equals(board[2][i])) {
                return board[0][i];
            }
        }
        if (!board[0][0].isEmpty() && board[0][0].equals(board[1][1]) && board[1][1].equals(board[2][2])) {
            return board[0][0];
        }
        if (!board[0][2].isEmpty() && board[0][2].equals(board[1][1]) && board[1][1].equals(board[2][0])) {
            return board[0][2];
        }

        boolean hasEmpty = false;
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                if (board[r][c].isEmpty()) {
                    hasEmpty = true;
                    break;
                }
            }
        }
        return hasEmpty ? null : "DRAW";
    }

    private String[][] copyBoard(String[][] board) {
        String[][] copy = new String[3][3];
        for (int i = 0; i < 3; i++) {
            copy[i] = board[i].clone();
        }
        return copy;
    }
}
