// express and socket.io entry point
require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');

const rfqRoutes = require('./routes/rfqs');
const bidRoutes = require('./routes/bids');
const { resumeActiveAuctions } = require('./services/auctionTimer');

const app    = express(); // entry
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' },
});

app.set('io', io);
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/rfqs', rfqRoutes);
app.use('/api/bids', bidRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Clients join a Socket.io room per RFQ.
// Only clients watching that specific auction receive its events.
// This prevents broadcasting to everyone on every bid.
io.on('connection', (socket) => {
  socket.on('join_auction',  (id) => socket.join(id));
  socket.on('leave_auction', (id) => socket.leave(id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  console.log(`Server on :${PORT}`);
  try {
    await resumeActiveAuctions(io);
  } catch (e) {
    console.log('DB not ready yet:', e.message);
  }
});
