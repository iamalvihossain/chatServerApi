const express = require("express");
require("dotenv").config();
const colors = require("colors");
const connectDB = require("./config/db");
const cors = require("cors");
const { verify } = require("jsonwebtoken");
const User = require("./models/user");
const http = require("http");
const { Server } = require("socket.io");
const socketIo = require("socket.io");

const Message = require("./models/message");

connectDB();

const app = express();
app.use(cors());

// app.use(async (req, res, next) => {
//   const token = req.headers.authorization || "";
//   if (token) {
//     try {
//       const decodedToken = verify(token, process.env.JWT_SECRET);
//       const user = await User.findById(decodedToken.id);
//       if (user) {
//         req.user = user; // Set req.user as the user object
//       }
//     } catch (error) {
//       console.error("Failed to authenticate token");
//     }
//   }
//   next();
// });

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
