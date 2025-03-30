import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager";

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server started on port 8080");

const gameManager = new GameManager();

wss.on('connection', function connection(ws) {
    console.log("New client connected");
    gameManager.addUser(ws);
    
    ws.on('close', () => {
        console.log("Client disconnected");
        gameManager.removeUser(ws);
    });
});