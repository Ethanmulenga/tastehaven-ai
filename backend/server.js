// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const Groq = require('groq-sdk');
const rateLimit = require('express-rate-limit'); // NEW: Import rate limiter

// Import Database Models
const { MenuItem, RestaurantInfo, ChatSession, Order } = require('./models');

const app = express();
const server = http.createServer(app);

// --- MIDDLEWARE ---
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- GUARDRAIL: Rate Limiting ---
// Prevents spamming. Limits each IP to 30 messages per minute.
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per windowMs
  message: { success: false, message: "Too many messages! Please wait a minute before sending another." }
});

// --- GROQ AI SETUP ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Admin Dashboard connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('❌ Admin Dashboard disconnected');
  });
});

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// --- GROQ CONNECTION TEST ---
async function testGroqConnection() {
  try {
    console.log('🤖 Testing Groq AI connection...');
    
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Groq!" in one sentence only.'
        }
      ],
      max_tokens: 20
    });

    const aiReply = response.choices[0].message.content;
    console.log('✅ Groq AI is connected! Response:', aiReply);
    return true;
  } catch (error) {
    console.error('❌ Groq AI connection failed!');
    console.error('Error details:', error.message);
    console.error('💡 Tip: Check that your GROQ_API_KEY in the .env file is correct.');
    return false;
  }
}

// --- API ROUTES ---
// Pass io to the chat routes, and apply the rate limiter
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatLimiter, chatRoutes(io));

// --- PUBLIC ADMIN ROUTES (No password required) ---
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/analytics', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });
    const completedOrders = await Order.countDocuments({ status: 'Completed' });

    res.json({
      success: true,
      analytics: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingOrders,
        completedOrders
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await Order.findOneAndUpdate(
      { orderId },
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Emit status update to connected clients
    io.emit('order_status_updated', { orderId, status });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- SERVE ADMIN DASHBOARD ---
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// --- BASIC ROUTES ---
app.get('/', (req, res) => {
  res.send('🍽️ TasteHaven AI Backend is running!');
});

app.get('/api/test-ai', async (req, res) => {
  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are Savory, a friendly AI dining concierge for TasteHaven restaurant.'
        },
        {
          role: 'user',
          content: 'Introduce yourself in one short sentence.'
        }
      ],
      max_tokens: 50
    });

    res.json({
      status: 'success',
      model: process.env.GROQ_MODEL,
      response: response.choices[0].message.content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

app.get('/api/test-db', async (req, res) => {
  try {
    const menuCount = await MenuItem.countDocuments();
    const infoCount = await RestaurantInfo.countDocuments();

    res.json({
      status: 'success',
      database: 'Connected',
      menuItems: menuCount,
      restaurantInfo: infoCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
  await testGroqConnection();
});