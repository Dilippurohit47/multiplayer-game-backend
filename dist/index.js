"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const cors_1 = __importDefault(require("cors"));
const uuid_1 = require("uuid");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
const userMap = new Map();
let counter = 1;
const moveUp = (id) => {
    let player = userMap.get(id);
    if (player) {
        player.positions.y -= 10;
        userMap.set(id, player);
    }
};
const moveDown = (id) => {
    let player = userMap.get(id);
    if (player) {
        player.positions.y += 10;
        userMap.set(id, player);
    }
};
const moveRight = (id) => {
    let player = userMap.get(id);
    if (player) {
        player.positions.x += 10;
        userMap.set(id, player);
    }
};
const moveLeft = (id) => {
    let player = userMap.get(id);
    if (player) {
        player.positions.x -= 10;
        userMap.set(id, player);
    }
};
wss.on("connection", (ws) => {
    const userId = (0, uuid_1.v4)();
    let x = Math.random() * 800;
    let y = Math.random() * 600;
    userMap.set(userId, { ws, positions: { x: x, y: y } });
    ws.send(JSON.stringify({
        type: "connected-user",
        userId: userId,
        positions: userMap.get(userId).positions,
    }));
    ws.onmessage = (m) => {
        const data = JSON.parse(m.data);
        if (data.type === "get-players") {
            const players = Array.from(userMap.keys());
            players.map((id) => {
                let ws = userMap.get(id).ws;
                ws.send(JSON.stringify({
                    type: "get-players",
                    players: Object.fromEntries(userMap),
                }));
            });
        }
        if (data.type === "move") {
            if (data.direction === "moveUp") {
                moveUp(data.id);
            }
            if (data.direction === "moveDown") {
                moveDown(data.id);
            }
            if (data.direction === "moveRight") {
                moveRight(data.id);
            }
            if (data.direction === "moveLeft") {
                moveLeft(data.id);
            }
            const players = Array.from(userMap.keys());
            players.map((id) => {
                let ws = userMap.get(id).ws;
                ws.send(JSON.stringify({
                    type: "get-players",
                    players: Object.fromEntries(userMap),
                }));
            });
        }
    };
    ws.on("close", () => {
        userMap.delete(userId);
    });
});
server.listen(5000, () => {
    console.log(`server is running on http//:localhost:5000`);
});
