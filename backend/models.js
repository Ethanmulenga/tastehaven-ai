const mongoose = require('mongoose');

// 1. MENU ITEM: The food the AI can recommend and sell
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, enum: ['Appetizer', 'Main', 'Dessert', 'Drink'], required: true },
  available: { type: Boolean, default: true },
  allergens: [String] 
});

// 2. RESTAURANT INFO: Static facts the AI needs to know
const restaurantInfoSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, 
  value: { type: String, required: true }
});

// 3. CHAT SESSION: Tracks the "ghost" user, their chat history, and their active cart
const chatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  guestName: { type: String }, // Added
  guestPhone: { type: String }, // Added
  messages: [{
    role: { type: String, enum: ['user', 'ai'] },
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  cart: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    quantity: Number,
    price: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

// 4. ORDER: The finalized receipt sent to the kitchen
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, 
  sessionId: { type: String, required: true },
  guestName: { type: String, required: true },
  guestPhone: { type: String, required: true },
  items: [{
    name: String,
    quantity: Number,
    price: Number
  }],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  MenuItem: mongoose.model('MenuItem', menuItemSchema),
  RestaurantInfo: mongoose.model('RestaurantInfo', restaurantInfoSchema),
  ChatSession: mongoose.model('ChatSession', chatSessionSchema),
  Order: mongoose.model('Order', orderSchema)
};