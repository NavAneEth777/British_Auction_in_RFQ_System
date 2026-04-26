// RFQ CRUD + activate endpoint

const express = require('express');
const router  = express.Router();
const pool    = require('../models/db');
const { startSafetyTimer } = require('../services/auctionTimer');

// GET /api/rfqs — list all auctions for the listing page
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id, r.name, r.reference_id,
        r.bid_start_time, r.bid_close_time, r.forced_close_time,
        r.status,
        MIN(b.total_charges)  AS lowest_bid,
        COUNT(b.id)::int      AS total_bids
      FROM rfqs r
      LEFT JOIN bids b ON b.rfq_id = r.id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rfqs/:id — full detail: rfq + config + ranked bids + log
router.get('/:id', async (req, res) => {
  try {
    const [rfqRes, configRes, bidsRes, logRes] = await Promise.all([
      pool.query('SELECT * FROM rfqs WHERE id = $1', [req.params.id]),
      pool.query('SELECT * FROM auction_configs WHERE rfq_id = $1', [req.params.id]),
      pool.query(`
        SELECT *,
          RANK() OVER (ORDER BY total_charges ASC) AS rank
        FROM bids WHERE rfq_id = $1
        ORDER BY total_charges ASC
      `, [req.params.id]),
      pool.query(`
        SELECT * FROM auction_activity_log
        WHERE rfq_id = $1
        ORDER BY created_at DESC
      `, [req.params.id]),
    ]);

    if (!rfqRes.rows[0]) return res.status(404).json({ error: 'Not found' });

    res.json({
      rfq:          rfqRes.rows[0],
      config:       configRes.rows[0],
      bids:         bidsRes.rows,
      activity_log: logRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rfqs — create a new RFQ
router.post('/', async (req, res) => {
  const {
    name, bid_start_time, bid_close_time, forced_close_time, pickup_date,
    trigger_window_minutes, extension_duration_minutes, extension_trigger,
  } = req.body;

  // Validation — both checked on frontend too, but always validate on server
  if (new Date(forced_close_time) <= new Date(bid_close_time)) {
    return res.status(400).json({ error: 'Forced close must be after bid close' });
  }
  if (new Date(bid_close_time) <= new Date(bid_start_time)) {
    return res.status(400).json({ error: 'Bid close must be after bid start' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const refId = 'RFQ-' + Date.now().toString().slice(-6);
    const rfq = (await client.query(
      `INSERT INTO rfqs
         (name, reference_id, bid_start_time, bid_close_time, forced_close_time, pickup_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, refId, bid_start_time, bid_close_time, forced_close_time, pickup_date || null]
    )).rows[0];

    await client.query(
      `INSERT INTO auction_configs
         (rfq_id, trigger_window_minutes, extension_duration_minutes, extension_trigger)
       VALUES ($1,$2,$3,$4)`,
      [rfq.id, trigger_window_minutes||10, extension_duration_minutes||5, extension_trigger||'bid_received']
    );

    await client.query('COMMIT');
    res.status(201).json(rfq);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/rfqs/:id/activate
router.post('/:id/activate', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE rfqs SET status='active' WHERE id=$1 AND status='upcoming' RETURNING *",
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Already active or not found' });
    }
    startSafetyTimer(req.params.id, req.app.get('io'));
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
