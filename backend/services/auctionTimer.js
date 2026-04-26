const pool = require('../models/db');

// ============================================================
// Auction Timer Service — v2 (event-driven)
//
// V1 problem: setInterval fires every 15 seconds regardless of
// whether any bids came in. 99% of those checks do nothing.
//
// V2 fix: the check runs IMMEDIATELY after a bid is submitted,
// triggered from the bids route. No polling at all during quiet
// periods. One background loop still runs every 60s as a safety
// net to catch force-close deadlines.
// ============================================================

// Safety net: one interval per active auction, checks every 60s
// just for forced-close. Extension checks are event-driven.
const safetyTimers = {};

async function resumeActiveAuctions(io) {
  const result = await pool.query(
    "SELECT id FROM rfqs WHERE status = 'active'"
  );
  for (const row of result.rows) {
    startSafetyTimer(row.id, io);
  }
  console.log(`Resumed ${result.rows.length} active auction(s)`);
}

function startSafetyTimer(rfqId, io) {
  if (safetyTimers[rfqId]) return;
  const id = setInterval(async () => {
    await checkForceClose(rfqId, io);
  }, 60000); // every 60s — only for deadline enforcement
  safetyTimers[rfqId] = id;
}

function stopSafetyTimer(rfqId) {
  clearInterval(safetyTimers[rfqId]);
  delete safetyTimers[rfqId];
}

// ============================================================
// Main function — called immediately when a bid is submitted
// ============================================================
async function onBidSubmitted(rfqId, bidId, io) {
  const rfqResult = await pool.query(
    'SELECT r.*, c.trigger_window_minutes, c.extension_duration_minutes, c.extension_trigger FROM rfqs r JOIN auction_configs c ON c.rfq_id = r.id WHERE r.id = $1',
    [rfqId]
  );
  const rfq = rfqResult.rows[0];
  if (!rfq || rfq.status !== 'active') return;

  const now            = new Date();
  const bidCloseTime   = new Date(rfq.bid_close_time);
  const forcedClose    = new Date(rfq.forced_close_time);

  // Already past forced close — close immediately
  if (now >= forcedClose) {
    await closeAuction(rfqId, 'force_closed', io);
    return;
  }

  // Already past bid close — close
  if (now >= bidCloseTime) {
    await closeAuction(rfqId, 'closed', io);
    return;
  }

  // Are we inside the trigger window?
  const windowStart = new Date(
    bidCloseTime.getTime() - rfq.trigger_window_minutes * 60 * 1000
  );
  if (now < windowStart) return; // bid came in too early, no extension

  // Should we extend based on the trigger type?
  const shouldExtend = await evaluateTrigger(rfqId, rfq, bidId);
  if (!shouldExtend) return;

  await extendAuction(rfqId, rfq, forcedClose, io);
}

async function evaluateTrigger(rfqId, rfq, newBidId) {
  const trigger = rfq.extension_trigger;

  if (trigger === 'bid_received') {
    // Any bid in the window → extend. Since this function is called
    // right after a bid is inserted, the answer is always yes.
    return true;
  }

  if (trigger === 'any_rank_change') {
    // A new bid always reshuffles the rankings → yes.
    return true;
  }

  if (trigger === 'l1_rank_change') {
    // Extend only if the newly submitted bid IS the new L1.
    const result = await pool.query(
      `SELECT id FROM bids WHERE rfq_id = $1 ORDER BY total_charges ASC LIMIT 1`,
      [rfqId]
    );
    return result.rows[0]?.id === newBidId;
  }

  return false;
}

async function extendAuction(rfqId, rfq, forcedClose, io) {
  const currentClose = new Date(rfq.bid_close_time);
  let newClose = new Date(
    currentClose.getTime() + rfq.extension_duration_minutes * 60 * 1000
  );

  // Clamp to forced close
  if (newClose > forcedClose) newClose = forcedClose;

  // Edge case: if the extension would be less than 30 seconds,
  // just force close now rather than dangling.
  const gainMs = newClose - currentClose;
  if (gainMs < 30000) {
    await closeAuction(rfqId, 'force_closed', io);
    return;
  }

  // SELECT FOR UPDATE prevents two concurrent bids from both
  // triggering an extension at the same millisecond.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT id FROM rfqs WHERE id = $1 FOR UPDATE',
      [rfqId]
    );
    await client.query(
      'UPDATE rfqs SET bid_close_time = $1 WHERE id = $2',
      [newClose, rfqId]
    );
    // Note: the DB trigger handles writing to auction_activity_log.
    // We don't need to insert manually here.
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const description = `Extended by ${rfq.extension_duration_minutes} min (${rfq.extension_trigger})`;
  console.log(`RFQ ${rfqId} extended → ${newClose.toISOString()}`);

  io.to(rfqId).emit('auction_extended', {
    rfqId,
    newCloseTime: newClose,
    description,
  });
}

async function checkForceClose(rfqId, io) {
  const result = await pool.query(
    "SELECT * FROM rfqs WHERE id = $1 AND status = 'active'",
    [rfqId]
  );
  const rfq = result.rows[0];
  if (!rfq) { stopSafetyTimer(rfqId); return; }

  const now = new Date();
  if (now >= new Date(rfq.forced_close_time)) {
    await closeAuction(rfqId, 'force_closed', io);
  } else if (now >= new Date(rfq.bid_close_time)) {
    await closeAuction(rfqId, 'closed', io);
  }
}

async function closeAuction(rfqId, closeType, io) {
  await pool.query(
    'UPDATE rfqs SET status = $1 WHERE id = $2',
    [closeType, rfqId]
  );
  await pool.query(
    `INSERT INTO auction_activity_log (rfq_id, event_type, description)
     VALUES ($1, $2, $3)`,
    [rfqId, closeType === 'force_closed' ? 'force_closed' : 'auction_closed',
     closeType === 'force_closed' ? 'Forced close time reached' : 'Auction closed normally']
  );
  stopSafetyTimer(rfqId);
  io.to(rfqId).emit('auction_closed', { rfqId, closeType });
  console.log(`RFQ ${rfqId} → ${closeType}`);
}

module.exports = { onBidSubmitted, startSafetyTimer, resumeActiveAuctions };
