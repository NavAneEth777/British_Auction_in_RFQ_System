// ============================================================
// Seed Script — Simulates a live British Auction
//
// Run: npm run seed
//
// What it does:
// 1. Creates one RFQ with bid close = 4 min from now,
//    forced close = 8 min from now, trigger window = 2 min,
//    extension = 1 min.
// 2. Activates the auction immediately.
// 3. Spawns 4 virtual suppliers who submit bids at random
//    intervals, with prices that gradually get lower to
//    simulate real competition.
//
// The result: open the UI, watch bids come in live,
// watch the timer extend when a bid hits in the final 2 min.
// ============================================================

require('dotenv').config();
const pool = require('./models/db');

const SUPPLIERS = [
  { name: 'BlueDart Logistics',  basePrice: 45000 },
  { name: 'DTDC Freight',        basePrice: 42000 },
  { name: 'Delhivery Express',   basePrice: 40000 },
  { name: 'Gati KWE',            basePrice: 38000 },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log('🌱 Starting seed...\n');

  const now      = new Date();
  const bidClose = new Date(now.getTime() + 4 * 60 * 1000);  // 4 min
  const forced   = new Date(now.getTime() + 8 * 60 * 1000);  // 8 min

  const client = await pool.connect();
  let rfqId;

  try {
    await client.query('BEGIN');

    const refId = 'RFQ-DEMO' + Date.now().toString().slice(-4);

    const rfq = (await client.query(
      `INSERT INTO rfqs
         (name, reference_id, bid_start_time, bid_close_time, forced_close_time, status)
       VALUES ($1,$2,$3,$4,$5,'active') RETURNING *`,
      ['Mumbai → Delhi Freight Demo', refId, now, bidClose, forced]
    )).rows[0];

    rfqId = rfq.id;

    await client.query(
      `INSERT INTO auction_configs
         (rfq_id, trigger_window_minutes, extension_duration_minutes, extension_trigger)
       VALUES ($1, 2, 1, 'bid_received')`,
      [rfqId]
    );

    await client.query(
      `INSERT INTO auction_activity_log (rfq_id, event_type, description)
       VALUES ($1, 'bid_submitted', 'Auction started — demo seed active')`,
      [rfqId]
    );

    await client.query('COMMIT');
    console.log(`✅ RFQ created: ${refId}`);
    console.log(`   Bid close:    ${bidClose.toLocaleTimeString()}`);
    console.log(`   Forced close: ${forced.toLocaleTimeString()}`);
    console.log(`\n🌐 Open http://localhost:3000 and watch the auction!\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }

  // Virtual bidders — each submits multiple bids with decreasing prices
  // to simulate real competition over the auction window.
  const bidTasks = [];

  SUPPLIERS.forEach((supplier, i) => {
    let currentPrice = supplier.basePrice;

    // Each supplier submits 3-5 bids at staggered intervals
    const rounds = rand(3, 5);

    for (let round = 0; round < rounds; round++) {
      // Spread bids across the 4-minute window, with some toward the end
      // to trigger the extension mechanism.
      const delayMs = rand(
        round * 45000,                         // spread across window
        Math.min((round + 1) * 55000, 230000)  // up to ~3:50 min
      );

      // Price drops a bit each round to simulate underbidding
      const priceForThisRound = currentPrice - rand(500, 2000);
      currentPrice = priceForThisRound;

      bidTasks.push({ supplier, price: priceForThisRound, delayMs });
    }
  });

  // Sort all bid tasks by delay so they fire in chronological order
  bidTasks.sort((a, b) => a.delayMs - b.delayMs);

  console.log(`📦 ${bidTasks.length} bids queued across 4 suppliers...\n`);

  // Fire bids one at a time with proper delays
  let lastDelay = 0;
  for (const task of bidTasks) {
    const waitMs = task.delayMs - lastDelay;
    lastDelay    = task.delayMs;
    await sleep(waitMs);

    try {
      const freight = task.price;
      const origin  = rand(1000, 3000);
      const dest    = rand(500, 2000);

      await pool.query(
        `INSERT INTO bids
           (rfq_id, carrier_name, freight_charges, origin_charges,
            destination_charges, transit_time_days, quote_validity_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [rfqId, task.supplier.name, freight, origin, dest,
         rand(2, 5), new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0]]
      );

      await pool.query(
        `INSERT INTO auction_activity_log (rfq_id, event_type, description)
         VALUES ($1,'bid_submitted',$2)`,
        [rfqId, `${task.supplier.name} bid ₹${freight + origin + dest}`]
      );

      console.log(`  💰 ${task.supplier.name.padEnd(22)} ₹${(freight+origin+dest).toLocaleString()}`);
    } catch (err) {
      // Auction may have closed by the time this bid fires — that's fine
      if (err.message.includes('violates')) {
        console.log(`  ⏹  Auction closed, stopping bids`);
        break;
      }
    }
  }

  console.log('\n✅ Seed complete. Auction is running!');
  pool.end();
}

seed().catch(console.error);
