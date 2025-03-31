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

type PlayerType ={
  ws:WebSocket;
  positions:{x:number ,y:number};
  messageTrueFor : string | null;
  receiverId:string | null;
}

const checkCollision = (pos1:{x:number ,y:number}, pos2:{x:number,y:number}) => {
  return (
    Math.abs(pos1.x - pos2.x) <= 20 &&
    Math.abs(pos1.y - pos2.y) <= 20
  );
};

const playerCollision = (player:PlayerType, id:string) => {
  let hasCollision = false;
  let collidedPlayerId = null;
  Array.from(userMap.keys()).forEach((userId) => {
    let otherPlayer = userMap.get(userId);
    if (!otherPlayer || id === userId) return;
    if (checkCollision(otherPlayer.positions, player.positions)) {
      hasCollision = true;
      collidedPlayerId = userId;
      player.messageTrueFor = id;
      player.receiverId = userId;
      otherPlayer.messageTrueFor = userId;
      otherPlayer.receiverId = id;
      userMap.set(userId, otherPlayer);
    }
  }); 

  if (!hasCollision) {
    player.messageTrueFor = null;
    player.receiverId = null;
  }
  return player;
};

const updateOtherPlayers = (movedPlayerId:string) => {
  const movedPlayer = userMap.get(movedPlayerId);
  Array.from(userMap.keys()).forEach((otherId) => {
    if (otherId === movedPlayerId) return;
    const otherPlayer = userMap.get(otherId);
    if (otherPlayer.receiverId === movedPlayerId) {
      const stillColliding = checkCollision(
        otherPlayer.positions,
        movedPlayer.positions
      );
      if (!stillColliding) {
        otherPlayer.messageTrueFor = null;
        otherPlayer.receiverId = null;
        userMap.set(otherId, otherPlayer);
      }
    }
  });
};

const moveDown = (id:string) => {
  let player = userMap.get(id);
  if (!player) return;
  player.positions.y += 10;
  let updatedPlayer = playerCollision(player, id);
  userMap.set(id, updatedPlayer);
  updateOtherPlayers(id);
};

const moveUp = (id:string) => {
  let player = userMap.get(id);
  if (player) {
    player.positions.y -= 10;
    let updatedPlayer = playerCollision(player, id);
    userMap.set(id, updatedPlayer);
    updateOtherPlayers(id);
  }
};

const moveRight = (id:string) => {
  let player = userMap.get(id);
  if (player) {
    player.positions.x += 10;
    let updatedPlayer = playerCollision(player, id);
    userMap.set(id, updatedPlayer);
    updateOtherPlayers(id);
  }
};

const moveLeft = (id:string) => {
  let player = userMap.get(id);
  if (player) {
    player.positions.x -= 10;
    let updatedPlayer = playerCollision(player, id);
    userMap.set(id, updatedPlayer);
    updateOtherPlayers(id);
  }
};

wss.on("connection", (ws) => {
  const userId = uuid();
  let x = Math.round((Math.random() * 800) / 10) * 10;
  let y = Math.round((Math.random() * 600) / 10) * 10;
  userMap.set(userId, {
    ws,
    positions: { x, y },
    messageTrueFor: null,
    receiverId: null,
  });
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
      Array.from(userMap.keys()).forEach((id) => {
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
      switch (data.direction) {
        case "moveUp":
          moveUp(data.id);
          break;
        case "moveDown":
          moveDown(data.id);
          break;
        case "moveRight":
          moveRight(data.id);
          break;
        case "moveLeft":
          moveLeft(data.id);
          break;
      }
      Array.from(userMap.keys()).forEach((id) => {
        let ws = userMap.get(id).ws;
        ws.send(
          JSON.stringify({
            type: "get-players",
            players: Object.fromEntries(userMap),
          })
        );
      });
    }

    if(data.type === "personal-msg"){
      console.log("message",data.message)
      const receiver = userMap.get(data.receiverId).ws
      receiver.send(JSON.stringify({type:"personal-msg" , message:data.message,senderId:userId}))
    }
  };
  ws.on("close", () => {
    userMap.delete(userId);
    Array.from(userMap.keys()).forEach((id) => {
      let ws = userMap.get(id).ws;
      ws.send(
        JSON.stringify({
          type: "get-players",
          players: Object.fromEntries(userMap),
        })
      );
    });
  });
});

server.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});