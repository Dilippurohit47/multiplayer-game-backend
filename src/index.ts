import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import { v4 as uuid } from "uuid";
const app = express();

app.use(cors());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const userMap = new Map();

const playerCollision = (player, id) => {
  let hasCollision = false; 
  let collidedPlayerId = null;
  Array.from(userMap.keys()).forEach((userId) => {
    let otherPlayer = userMap.get(userId);
    if (!otherPlayer) return; 
    if (id !== userId) {
      if (Math.abs(otherPlayer.positions.x - player.positions.x) <= 20 &&
          Math.abs(otherPlayer.positions.y - player.positions.y) <= 20) {
        console.log( otherPlayer.positions.y , player.positions.y)
        hasCollision = true;
        collidedPlayerId = userId
        player.messageTrueFor = id;
        player.receiverId = userId;
        otherPlayer.messageTrueFor = userId;
        otherPlayer.receiverId = id;
      }
    }
  });

  if (!hasCollision) {
    player.messageTrueFor = null;
    player.receiverId = null;
  }
  if (collidedPlayerId) {
    let otherPlayer = userMap.get(collidedPlayerId)
    if (otherPlayer) {
      otherPlayer.messageTrueFor = hasCollision ? collidedPlayerId : null;
      otherPlayer.receiverId = hasCollision ? id : null;
    }
  }

  return player; 
};

const moveDown = (id) => {
  let player = userMap.get(id);
  if (!player) return; // Exit if player does not exist

  player.positions.y += 10; // Move player down

  // Check for collision
  let updatedPlayer = playerCollision(player, id);

  userMap.set(id, updatedPlayer); 
};

const moveUp = (id) => {
  let player = userMap.get(id);
  if (player) {
    player.positions.y -= 10;
    let updatedPlayer = playerCollision(player, id);
    userMap.set(id, updatedPlayer); 
  }
};


const moveRight = (id) => {
  let player = userMap.get(id);
  if (player) {
    player.positions.x += 10;
    let updatedPlayer = playerCollision(player, id);
    userMap.set(id, updatedPlayer); 

  }
};

const moveLeft = (id) => {
  let player = userMap.get(id);
  if (player) {
    player.positions.x -= 10;
    let updatedPlayer = playerCollision(player, id);
    userMap.set(id, updatedPlayer); 
  }
};
wss.on("connection", (ws) => {
  const userId = uuid();
  let x = Math.round((Math.random() * 800)/10) * 10
  let y = Math.round((Math.random() * 600) / 10) * 10;
  userMap.set(userId, { ws, positions: { x: x, y: y } ,message:false ,receiverId:null });
  ws.send(
    JSON.stringify({
      type: "connected-user",
      userId: userId,
      positions: userMap.get(userId).positions,
    })
  );
  ws.onmessage = (m) => {
    const data = JSON.parse(m.data);
    if (data.type === "get-players") {
      const players = Array.from(userMap.keys());
      players.map((id) => {
        let ws = userMap.get(id).ws;
        ws.send(
          JSON.stringify({
            type: "get-players",
            players: Object.fromEntries(userMap),
          })
        );
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
        ws.send(
          JSON.stringify({
            type: "get-players",
            players: Object.fromEntries(userMap),
          })
        );
      });
    }
  };

  ws.on("close", () => {
    userMap.delete(userId);
console.log(userMap.size)
  });
});

server.listen(5000, () => {
  console.log(`server is running on http//:localhost:5000`);
});
