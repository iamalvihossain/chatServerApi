const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  userId: String,
  listingId: String,
  senderId: String,
  listingOwner: String,
  messages: [
    {
      senderEmail: String,
      listingOwnerEmail: String,
      listingOwnerName: String,
      userId: String,
      senderId: String,
      listingId: String,
      listingOwner: String,
      text: String,
      pic: String,
      title: String,
      recipientId: String,
      name: String,
      readBy: [String], // Array of user IDs who have read the message
      createdAt: {
        type: Date,
        default: Date.now,
      },
      read: {
        type: Boolean,
        default: false,
      },
    },
  ],
});
module.exports = mongoose.model("Message", messageSchema);
