
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  userId: String,
  listingId: String,
  senderId: String,
  listingOwner: String, 
  messages: [
    {
      userId: String,
      senderId: String,
      listingId: String,
      listingOwner: String,
      text: String,
      pic: String,
      title: String,
      name: String,
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
