const express = require("express");
require("dotenv").config();
const colors = require("colors");
const connectDB = require("./config/db");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/message");

connectDB();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("join", ({ listingId, userId }) => {
    const room = `${listingId} - ${userId}`;
    socket.join(room);
  });

  socket.on(
    "message",
    async ({
      userId,
      listingId,
      senderId,
      text,
      pic,
      name,
      listingOwner,
      title,
      listingOwnerEmail,
      listingOwnerName,
      senderEmail,
    }) => {
      const room = `${listingId} - ${userId}`;
      try {
        let messageDoc = await Message.findOne({ userId, listingId });
        if (!messageDoc) {
          messageDoc = new Message({ userId, listingId });
        }

        messageDoc.listingOwner = listingOwner;
        messageDoc.messages.push({
          senderId,
          senderEmail,
          text,
          userId,
          listingId,
          listingOwner,
          name,
          title,
          pic,
          listingOwnerEmail,
          listingOwnerName,
          readBy: [senderId], // Add the sender's ID to the readBy array
        });
        await messageDoc.save();
        io.to(room).emit("message", {
          senderId,
          text,
          userId,
          listingId,
          pic,
          listingOwner,
          name,
          title,
          listingOwnerEmail,
          listingOwnerName,
          senderEmail,
        });
      } catch (error) {
        console.error("Error saving message:", error);
      }
    }
  );
});

const port = process.env.PORT || 5000;

server.listen(port, () => {
  console.log(`server running on port ${port}`);
});
