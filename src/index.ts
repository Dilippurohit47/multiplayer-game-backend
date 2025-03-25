import express from "express"
import http from "http"
import { WebSocketServer } from "ws"
const app  = express()


app.use(express.json())
const server = http.createServer(app)

const wss = new WebSocketServer({server})

wss.on("connection",(ws,req) =>{
    console.log("Client connected")
})

server.listen(5000,() =>{
    console.log(`server is running on http://localhost:500`)
})