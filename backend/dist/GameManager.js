"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const Messages_1 = require("./Messages");
const Game_1 = require("./Game");
class GameManager {
    constructor() {
        this.games = [];
        this.users = [];
        this.queues = {
            180: [], // 3 min
            300: [], // 5 min
            600: [] // 10 min
        };
        this.drawOffers = new Map();
    }
    addUser(socket) {
        this.users.push(socket);
        this.addHandler(socket);
    }
    removeUser(socket) {
        this.users = this.users.filter(user => user !== socket);
        // Remove user from all queues
        Object.keys(this.queues).forEach(key => {
            const timeLimit = parseInt(key);
            this.queues[timeLimit] = this.queues[timeLimit].filter(entry => entry.socket !== socket);
        });
        // Handle disconnection in active games
        const game = this.games.find(g => g.player1 === socket || g.player2 === socket);
        if (game) {
            if (game.player1 === socket) {
                // Player 1 disconnected, player 2 wins
                this.notifyDisconnect(game.player2, 'white');
            }
            else {
                // Player 2 disconnected, player 1 wins
                this.notifyDisconnect(game.player1, 'black');
            }
            // Remove the game
            this.games = this.games.filter(g => g !== game);
            // Remove any draw offers for this game
            this.drawOffers.delete(game);
        }
    }
    notifyDisconnect(winner, disconnectedColor) {
        winner.send(JSON.stringify({
            type: Messages_1.GAME_OVER,
            payload: {
                winner: disconnectedColor === 'white' ? 'black' : 'white',
                reason: 'disconnection'
            }
        }));
    }
    addHandler(socket) {
        socket.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log("Received message:", message);
                if (message.type === Messages_1.JOIN_QUEUE) {
                    const timeLimit = message.payload.timeLimit;
                    if (timeLimit in this.queues) {
                        // Remove player from all other queues first
                        Object.keys(this.queues).forEach(key => {
                            const queueTimeLimit = parseInt(key);
                            this.queues[queueTimeLimit] = this.queues[queueTimeLimit].filter(entry => entry.socket !== socket);
                        });
                        // Add player to the selected queue
                        this.queues[timeLimit].push({ socket, timeLimit });
                        console.log(`Player added to ${timeLimit} seconds queue`);
                        // Check if we can match players in THIS specific queue
                        if (this.queues[timeLimit].length >= 2) {
                            const player1 = this.queues[timeLimit][0];
                            const player2 = this.queues[timeLimit][1];
                            if (player1.socket !== player2.socket) {
                                // Create a new game with MATCHING time limits
                                const game = new Game_1.Game(player1.socket, player2.socket, timeLimit);
                                this.games.push(game);
                                // Remove these players from queue
                                this.queues[timeLimit] = this.queues[timeLimit].slice(2);
                                console.log(`Game created with two players for ${timeLimit} seconds`);
                            }
                            else {
                                // Same player in multiple tabs, don't start a game
                                console.log(`Same player in multiple entries, not creating game`);
                                // Remove duplicate entries
                                this.queues[timeLimit] = this.queues[timeLimit].filter(entry => entry !== player1);
                            }
                        }
                    }
                }
                if (message.type === Messages_1.MOVE) {
                    console.log("Move message received", message.payload);
                    const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                    if (game) {
                        game.makeMove(socket, message.payload);
                    }
                    else {
                        console.log("Game not found for this player");
                    }
                }
                if (message.type === Messages_1.RESIGN) {
                    console.log("Resignation received");
                    const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                    if (game) {
                        // Determine the winner based on who resigned
                        const winner = game.player1 === socket ? game.player2 : game.player1;
                        const winnerColor = game.player1 === socket ? 'black' : 'white';
                        // Notify both players
                        game.player1.send(JSON.stringify({
                            type: Messages_1.GAME_OVER,
                            payload: {
                                winner: winnerColor,
                                reason: 'resignation'
                            }
                        }));
                        game.player2.send(JSON.stringify({
                            type: Messages_1.GAME_OVER,
                            payload: {
                                winner: winnerColor,
                                reason: 'resignation'
                            }
                        }));
                        this.games = this.games.filter(g => g !== game);
                        this.drawOffers.delete(game);
                    }
                }
                if (message.type === Messages_1.OFFER_DRAW) {
                    console.log("Draw offer received");
                    const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                    if (game) {
                        this.drawOffers.set(game, socket);
                        const opponent = game.player1 === socket ? game.player2 : game.player1;
                        opponent.send(JSON.stringify({
                            type: Messages_1.OFFER_DRAW
                        }));
                    }
                }
                if (message.type === Messages_1.DRAW_RESPONSE) {
                    console.log("Draw response received:", message.payload.accepted);
                    const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                    if (game) {
                        // Get the player who offered the draw
                        const drawOfferer = this.drawOffers.get(game);
                        if (drawOfferer) {
                            if (message.payload.accepted) {
                                // Draw accepted, end the game
                                game.player1.send(JSON.stringify({
                                    type: Messages_1.GAME_OVER,
                                    payload: {
                                        winner: 'draw',
                                        reason: 'draw'
                                    }
                                }));
                                game.player2.send(JSON.stringify({
                                    type: Messages_1.GAME_OVER,
                                    payload: {
                                        winner: 'draw',
                                        reason: 'draw'
                                    }
                                }));
                                // Remove the game
                                this.games = this.games.filter(g => g !== game);
                            }
                            else {
                                // Draw declined, notify the offerer
                                drawOfferer.send(JSON.stringify({
                                    type: Messages_1.DRAW_RESPONSE,
                                    payload: {
                                        accepted: false
                                    }
                                }));
                            }
                            this.drawOffers.delete(game);
                        }
                    }
                }
            }
            catch (error) {
                console.error("Error processing message:", error);
            }
        });
        socket.on('close', () => {
            console.log("WebSocket connection closed");
            this.removeUser(socket);
        });
    }
}
exports.GameManager = GameManager;
