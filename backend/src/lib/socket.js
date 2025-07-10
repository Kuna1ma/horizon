import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"]
    }
})

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}
const userSocketMap = {};

io.on("connection", (socket) =>{
    console.log("A user  connected",socket.id);
    
    const userId = socket.handshake.query.userId

    if(userId) userSocketMap[userId] = socket.id

    //used to send events to all the connected clients
    io.emit("getOnlineUsers",Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        console.log("A user has disconnected",socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    })

    socket.on("typing", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { from: userId });
    }
    });

    socket.on("stopTyping", ({ to }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
        io.to(receiverSocketId).emit("stopTyping", { from: userId });
    }
    });


})
export { io, app, server };