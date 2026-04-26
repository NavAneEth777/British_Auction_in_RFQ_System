# 🔨 British Auction RFQ System

A real-time British Auction platform for freight procurement. Buyers create RFQs, suppliers compete by lowering prices, and the system automatically extends the auction if last-minute bids come in — keeping everything fair.

---

## 🎭 The Story: "The Smart Auction Battle"

### 🌍 Scene 1 — The Need
**Ravi** (the buyer) needs to transport goods from Hyderabad to Chennai. Instead of negotiating with one supplier, he opens the platform and creates an **RFQ (Request for Quotation)**:

- Bid Start: **5:00 PM**
- Normal End: **6:00 PM**
- Forced End (Hard Limit): **6:30 PM**

---

### ⚔️ Scene 2 — The Auction Begins
At 5:00 PM, the auction goes live. Three suppliers enter:

| Supplier | Bid |
|----------|-----|
| 🚚 Arjun | ₹10,000 |
| 🚚 Bhavna | ₹9,500 |
| 🚚 Charan | ₹9,200 |

System ranks them:
- 🥇 **L1 → Charan** (lowest price, wins if auction ends now)
- 🥈 L2 → Bhavna
- 🥉 L3 → Arjun

---

### 🔥 Scene 3 — The British Auction Rule
This is not a regular auction. The system has a **Trigger Window (X = 10 minutes)**. Between **5:50 PM – 6:00 PM**, the system watches closely for any activity.

---

### 💥 Scene 4 — Last-Minute Drama
At **5:55 PM**, Bhavna submits: **₹8,800** — beats everyone!

New rankings:
- 🥇 Bhavna
- 🥈 Charan
- 🥉 Arjun

---

### ⏱️ Scene 5 — Time Extension!
System says: *"A new bid arrived in the last 10 minutes → extending auction by Y = 5 minutes"*

- Old end time: **6:00 PM**
- New end time: **6:05 PM**

Without this rule, Charan could have waited till 5:59:59 and no one could react. That's unfair ❌. The extension gives everyone a fair chance ✅.

---

### ⚡ Scene 6 — More Chaos
At **6:03 PM**, Charan bids **₹8,500**. Rankings change again → system extends to **6:10 PM**.

---

### 🚫 Scene 7 — The Ultimate Rule
No matter how many extensions happen, the auction **STOPS at 6:30 PM**. That's the **Forced Close Time** — a hard wall that cannot be crossed.

---

### 🎯 Final Outcome
- Lowest bidder wins 🏆
- Ravi gets the best price 💰
- Competition was fair and transparent 🤝

---

## 🏗️ Architecture

```
Browser (React)
     │  HTTP + WebSocket
     ▼
Express API (Node.js) ──→ PostgreSQL
     │
     └── Socket.io (real-time events)
         - new_bid
         - auction_extended
         - auction_closed
```

**Tech Stack:**
- **Frontend:** React.js (Create React App)
- **Backend:** Node.js + Express + Socket.io
- **Database:** PostgreSQL 15
- **Containerization:** Docker + Docker Compose

---

## 🗄️ Database Schema

```
rfqs                    → One row per auction (stores current bid_close_time)
auction_configs         → Extension settings (X, Y, trigger type) per RFQ
bids                    → All supplier quotes (total auto-computed by DB)
auction_activity_log    → Immutable log of every bid/extension/close event
```

Key design decisions:
- `total_charges` is a **GENERATED column** — DB computes it, not the frontend
- A **PostgreSQL trigger** auto-logs every extension — app code can never forget
- `forced_close_time` is **never updated** — only `bid_close_time` extends

---

## 🚀 Running with Docker (Recommended)

### Step 1 — Install Docker Desktop

1. Go to [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Download **Docker Desktop for Mac (Apple Silicon or Intel)**
3. Open the downloaded `.dmg` file and drag Docker to Applications
4. Open Docker from Applications — wait for the whale icon 🐋 in the menu bar to stop animating
5. Verify installation:
```bash
docker --version
docker-compose --version
```

### Step 2 — Clone & Run

```bash
# Clone the repo
git clone https://github.com/NavAneEth777/British_Auction_in_RFQ_System.git
cd British_Auction_in_RFQ_System

# Start everything (first run takes ~2-3 minutes to download images)
docker-compose up --build
```

### Step 3 — Open the App

| Service | URL |
|---------|-----|
| 🖥️ Frontend (React) | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:4000/api/health |
| 🗄️ PostgreSQL | localhost:5432 |

### Stopping the App

```bash
# Stop everything
docker-compose down

# Stop and delete all data (fresh start)
docker-compose down -v
```

---

## 💻 Running Manually (Without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL 15 running locally

### Step 1 — Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE gocomet_auction;"

# Run schema
psql -U postgres -d gocomet_auction -f backend/schema.sql
```

### Step 2 — Backend

```bash
cd backend
npm install

# Create .env file
echo "DB_HOST=localhost
DB_PORT=5432
DB_NAME=gocomet_auction
DB_USER=postgres
DB_PASSWORD=password
PORT=4000
FRONTEND_URL=http://localhost:3000" > .env

node server.js
```

### Step 3 — Frontend

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

---

## 📖 How to Use the App

### Creating an RFQ
1. Click **"+ New RFQ"** on the homepage
2. Enter name, bid start/close times, and forced close time
3. Set the trigger window (X) and extension duration (Y)
4. Choose what triggers an extension (new bid / rank change / L1 change)
5. Click **"Create RFQ"**

### Running the Auction
1. From the RFQ detail page, click **"▶ Activate Auction"**
2. Suppliers fill in carrier name, freight charges, origin/destination charges
3. The system automatically ranks all bids (L1 = lowest total)
4. If a bid arrives near close time → auction extends automatically
5. Watch the **Activity Log** to see every extension and why it happened

### Extension Trigger Options

| Option | When it extends |
|--------|-----------------|
| **Any bid received** | Any supplier submits a bid in last X min |
| **Any rank change** | Any bid that reshuffles the leaderboard |
| **L1 change only** | Only when the #1 (cheapest) supplier changes |

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rfqs` | List all RFQs |
| POST | `/api/rfqs` | Create new RFQ |
| GET | `/api/rfqs/:id` | Get RFQ details + bids + log |
| POST | `/api/rfqs/:id/activate` | Start the auction |
| POST | `/api/bids` | Submit a supplier bid |
| GET | `/api/health` | Health check |

### WebSocket Events (Socket.io)

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_auction` | Client → Server | `rfqId` |
| `new_bid` | Server → Client | — |
| `auction_extended` | Server → Client | `{ rfqId, newCloseTime }` |
| `auction_closed` | Server → Client | `{ rfqId, closeType }` |

---

## 📁 Project Structure

```
british-auction-rfq/
├── backend/
│   ├── server.js           # Express + Socket.io entry point
│   ├── schema.sql          # PostgreSQL tables + trigger
│   ├── routes/
│   │   ├── rfqs.js         # RFQ CRUD + activate endpoint
│   │   └── bids.js         # Bid submission + extension logic
│   ├── services/
│   │   └── auctionTimer.js # Auto-close when bid_close_time passes
│   ├── models/db.js        # PostgreSQL connection pool
│   └── Dockerfile
├── frontend/
│   ├── public/index.html   # HTML entry point
│   ├── src/
│   │   ├── App.js          # Router setup
│   │   ├── pages/
│   │   │   ├── AuctionList.jsx    # Homepage — all RFQs
│   │   │   ├── AuctionDetail.jsx  # Live auction view
│   │   │   └── CreateRFQ.jsx      # New auction form
│   │   ├── components/
│   │   │   └── PriceHistoryChart.jsx
│   │   └── utils/api.js    # Axios + Socket.io helpers
│   └── Dockerfile
├── docker-compose.yml      # One command to start everything
└── README.md
```

---

## 🧠 Key Design Decisions

**Why PostgreSQL trigger for logging extensions?**  
The application code could forget to log. A DB trigger guarantees it — every time `bid_close_time` changes, Postgres writes the log entry. Zero chance of missing it.

**Why `total_charges` as a GENERATED column?**  
Frontend math can be wrong or manipulated. The database always computes `freight + origin + destination`. This is a financial field — we trust the DB, not the client.

**Why Socket.io rooms per RFQ?**  
Broadcasting every event to all connected clients wastes bandwidth. Each client joins only the room for the auction they're watching. Only relevant events are sent.

**Why partial index on active RFQs?**  
The timer service queries active auctions every few seconds. A partial index `WHERE status = 'active'` covers only the handful of active rows, not all historical RFQs. Much faster.

---

*Built for GoComet Assignment — British Auction in RFQ System*
