# British Auction RFQ System

A real-time freight procurement platform where suppliers compete by **lowering prices**. Built with React, Node.js, Socket.io, and PostgreSQL.

> **How it works:** Buyers create RFQs with a bid window. Suppliers submit prices — lowest wins. If a bid arrives in the last X minutes, the auction automatically extends by Y minutes to keep competition fair. A hard deadline ensures it always ends.

---

## Quick Start (Docker — Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running

### Run

```bash
git clone https://github.com/NavAneEth777/British_Auction_in_RFQ_System.git
cd British_Auction_in_RFQ_System
docker-compose up --build
```

First run takes ~2–3 minutes to download images.

### Open

| Service | URL |
|---------|-----|
| Frontend (React) | http://localhost:3000 |
| Backend API | http://localhost:4000/api/health |
| PostgreSQL | localhost:5432 |

### Stop

```bash
docker-compose down          # stop containers
docker-compose down -v       # stop + delete all data (fresh start)
```

---

## Manual Setup (Without Docker)

**Prerequisites:** Node.js 18+, PostgreSQL 15

### 1 — Database

```bash
psql -U postgres -c "CREATE DATABASE gocomet_auction;"
psql -U postgres -d gocomet_auction -f backend/schema.sql
```

### 2 — Backend

```bash
cd backend
npm install

cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gocomet_auction
DB_USER=postgres
DB_PASSWORD=password
PORT=4000
FRONTEND_URL=http://localhost:3000
EOF

node server.js
```

### 3 — Frontend

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

---

## Using the App

### Create an RFQ
1. Click **"+ New RFQ"**
2. Fill in name, bid start/close times, and forced close time
3. Set trigger window (X minutes) and extension duration (Y minutes)
4. Choose extension trigger: *any bid* / *any rank change* / *L1 change only*
5. Click **"Create RFQ"**

### Run the Auction
1. Open the RFQ → click **"▶️ Activate Auction"**
2. Suppliers fill in carrier name + freight, origin, and destination charges
3. Leaderboard updates in real-time (L1 = lowest total price)
4. If a bid arrives within the trigger window → auction auto-extends
5. Watch the **Activity Log** tab to see every extension event

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/rfqs` | List all RFQs |
| `POST` | `/api/rfqs` | Create new RFQ |
| `GET` | `/api/rfqs/:id` | RFQ details + bids + log |
| `POST` | `/api/rfqs/:id/activate` | Start the auction |
| `POST` | `/api/bids` | Submit a supplier bid |
| `GET` | `/api/health` | Health check |

### WebSocket Events (Socket.io)

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_auction` | Client → Server | `{ rfqId }` |
| `new_bid` | Server → Client | `{ bid, rankings }` |
| `auction_extended` | Server → Client | `{ rfqId, newCloseTime }` |
| `auction_closed` | Server → Client | `{ rfqId, closeType, winner }` |

---

## Project Structure

```
british-auction-rfq/
├── backend/
│   ├── server.js             # Express + Socket.io entry point
│   ├── schema.sql            # PostgreSQL tables, trigger, indexes
│   ├── routes/
│   │   ├── rfqs.js           # RFQ CRUD + activate
│   │   └── bids.js           # Bid submission + extension logic
│   ├── services/
│   │   └── auctionTimer.js   # Auto-closes expired auctions
│   ├── models/db.js          # PostgreSQL connection pool
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/
│   │   │   ├── AuctionList.jsx
│   │   │   ├── AuctionDetail.jsx
│   │   │   └── CreateRFQ.jsx
│   │   ├── components/
│   │   │   └── PriceHistoryChart.jsx
│   │   └── utils/api.js
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Tech Stack

- **Frontend:** React.js (Create React App), Axios, Socket.io-client, Chart.js
- **Backend:** Node.js, Express, Socket.io
- **Database:** PostgreSQL 15 (generated columns, trigger functions, partial indexes)
- **Infrastructure:** Docker, Docker Compose