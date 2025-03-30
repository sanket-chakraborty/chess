"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const chess_js_1 = require("chess.js");
const Messages_1 = require("./Messages");
class Game {
    constructor(player1, player2, timeLimit) {
        this.moveCount = 0;
        this.clockInterval = null;
        this.gameEnded = false;
        this.player1 = player1;
        this.player2 = player2;
        this.board = new chess_js_1.Chess();
        this.player1Time = timeLimit;
        this.player2Time = timeLimit;
        this.lastMoveTime = Date.now();
        this.player1.send(JSON.stringify({
            type: Messages_1.INIT_GAME,
            payload: {
                color: 'white',
                timeLimit: timeLimit
            }
        }));
        this.player2.send(JSON.stringify({
            type: Messages_1.INIT_GAME,
            payload: {
                color: 'black',
                timeLimit: timeLimit
            }
        }));
        this.startClock();
    }
    startClock() {
        this.clockInterval = setInterval(() => {
            if (this.gameEnded) {
                this.stopClock();
                return;
            }
            // Decrement time for the player whose turn it is
            if (this.moveCount % 2 === 0) {
                this.player1Time -= 0.1;
                if (this.player1Time <= 0) {
                    this.player1Time = 0;
                    this.endGame('black', 'timeout');
                }
            }
            else {
                this.player2Time -= 0.1;
                if (this.player2Time <= 0) {
                    this.player2Time = 0;
                    this.endGame('white', 'timeout');
                }
            }
            // Send clock updates every 100ms
            const clockData = JSON.stringify({
                type: Messages_1.CLOCK_UPDATE,
                payload: {
                    whiteTime: Math.max(0, this.player1Time).toFixed(1),
                    blackTime: Math.max(0, this.player2Time).toFixed(1)
                }
            });
            this.player1.send(clockData);
            this.player2.send(clockData);
        }, 100);
    }
    stopClock() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
    }
    endGame(winner, reason) {
        if (this.gameEnded)
            return;
        this.gameEnded = true;
        this.stopClock();
        const gameOverData = JSON.stringify({
            type: Messages_1.GAME_OVER,
            payload: {
                winner: winner,
                reason: reason
            }
        });
        this.player1.send(gameOverData);
        this.player2.send(gameOverData);
    }
    sendGameStatus() {
        let status = '';
        if (this.board.isCheck()) {
            status = 'check';
        }
        if (this.board.isCheckmate()) {
            status = 'checkmate';
            this.endGame(this.board.turn() === 'w' ? 'black' : 'white', 'checkmate');
        }
        else if (this.board.isDraw()) {
            status = 'draw';
            if (this.board.isStalemate()) {
                status = 'stalemate';
            }
            else if (this.board.isThreefoldRepetition()) {
                status = 'threefold repetition';
            }
            else if (this.board.isInsufficientMaterial()) {
                status = 'insufficient material';
            }
            this.endGame('draw', status);
        }
        if (status) {
            const statusData = JSON.stringify({
                type: Messages_1.GAME_STATUS,
                payload: {
                    status: status
                }
            });
            this.player1.send(statusData);
            this.player2.send(statusData);
        }
    }
    makeMove(socket, move) {
        if (this.moveCount % 2 === 0 && socket !== this.player1) {
            console.log("Not player 1's turn");
            return;
        }
        if (this.moveCount % 2 === 1 && socket !== this.player2) {
            console.log("Not player 2's turn");
            return;
        }
        try {
            this.board.move(move);
            // Update time for the player who just moved
            const currentTime = Date.now();
            const elapsedSeconds = (currentTime - this.lastMoveTime) / 1000;
            this.lastMoveTime = currentTime;
            if (this.moveCount % 2 === 0) {
                this.player1Time -= elapsedSeconds;
                if (this.player1Time < 0)
                    this.player1Time = 0;
            }
            else {
                this.player2Time -= elapsedSeconds;
                if (this.player2Time < 0)
                    this.player2Time = 0;
            }
            this.sendGameStatus();
            if (this.gameEnded)
                return;
            const moveData = JSON.stringify({
                type: Messages_1.MOVE,
                payload: move
            });
            this.player1.send(moveData);
            this.player2.send(moveData);
            const clockData = JSON.stringify({
                type: Messages_1.CLOCK_UPDATE,
                payload: {
                    whiteTime: Math.max(0, this.player1Time).toFixed(1),
                    blackTime: Math.max(0, this.player2Time).toFixed(1)
                }
            });
            this.player1.send(clockData);
            this.player2.send(clockData);
            this.moveCount++;
        }
        catch (error) {
            console.error("Invalid move:", error);
            return;
        }
    }
}
exports.Game = Game;
