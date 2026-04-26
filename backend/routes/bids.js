// Bid submission + extension logic

const express = require('express');
const router  = express.Router();
const pool    = require('../models/db');
const { onBidSubmitted } = require('../services/auctionTimer');

// POST /api/bids — supplier submits a quote
router.post('/', async (req, res) => {
  const {
    rfq_id, carrier_name, freight_charges,
    origin_charges, destination_charges,
    transit_time_days, quote_validity_date,
  } = req.body;

  if (!rfq_id || !carrier_name || freight_charges == null) {
    return res.status(400).json({ error: 'rfq_id, carrier_name, freight_charges required' });
  }

  // Check auction is active and bidding window is open
  const rfqResult = await pool.query(
    "SELECT * FROM rfqs WHERE id=$1 AND status='active'",
    [rfq_id]
  );
  const rfq = rfqResult.rows[0];
  if (!rfq) {
    return res.status(400).json({ error: 'Auction not active or does not exist' });
  }

  const now = new Date();

  // Grace period: allow bids up to 2 seconds after bid_close_time
  // to handle slight network delay. Beyond that, reject.
  const closeWithGrace = new Date(new Date(rfq.bid_close_time).getTime() + 2000);
  if (now > closeWithGrace) {
    return res.status(400).json({ error: 'Bidding window has closed' });
  }

  try {
    const bid = (await pool.query(
      `INSERT INTO bids
         (rfq_id, carrier_name, freight_charges, origin_charges,
          destination_charges, transit_time_days, quote_validity_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [rfq_id, carrier_name, freight_charges,
       origin_charges||0, destination_charges||0,
       transit_time_days||null, quote_validity_date||null]
    )).rows[0];

    // Log the bid submission
    await pool.query(
      `INSERT INTO auction_activity_log
         (rfq_id, event_type, description, triggered_by_bid_id)
       VALUES ($1,'bid_submitted',$2,$3)`,
      [rfq_id, `${carrier_name} bid ₹${bid.total_charges}`, bid.id]
    );

    // Notify all watching clients immediately
    const io = req.app.get('io');
    io.to(rfq_id).emit('new_bid', { bid });

    // ← This is the v2 improvement: extension check is event-driven.
    // It runs right now, triggered by this bid, not on a polling loop.
    onBidSubmitted(rfq_id, bid.id, io).catch(console.error);

    res.status(201).json(bid);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
