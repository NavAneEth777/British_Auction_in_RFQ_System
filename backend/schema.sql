-- PostgreSQL tables + trigger

-- Table: rfqs
-- Stores each Request for Quotation created by the buyer.
-- bid_close_time gets updated by the extension logic.
-- forced_close_time never changes — it is the hard wall.
CREATE TABLE rfqs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  reference_id     VARCHAR(100) UNIQUE NOT NULL,
  bid_start_time   TIMESTAMP NOT NULL,
  bid_close_time   TIMESTAMP NOT NULL,
  forced_close_time TIMESTAMP NOT NULL,
  pickup_date      DATE,
  status           VARCHAR(20) DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','active','closed','force_closed')),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Table: auction_configs
-- One config row per RFQ. Controls when and how extensions happen.
CREATE TABLE auction_configs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                      UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  trigger_window_minutes      INT  NOT NULL DEFAULT 10,
  extension_duration_minutes  INT  NOT NULL DEFAULT 5,
  -- bid_received       → any new bid in window triggers extension
  -- any_rank_change    → any new bid (which always reshuffles ranks)
  -- l1_rank_change     → only when the cheapest supplier changes
  extension_trigger           VARCHAR(30) NOT NULL DEFAULT 'bid_received'
    CHECK (extension_trigger IN ('bid_received','any_rank_change','l1_rank_change')),
  UNIQUE (rfq_id)
);

-- Table: bids

CREATE TABLE bids (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id               UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  carrier_name         VARCHAR(255) NOT NULL,
  freight_charges      DECIMAL(12,2) NOT NULL,
  origin_charges       DECIMAL(12,2) DEFAULT 0,
  destination_charges  DECIMAL(12,2) DEFAULT 0,
  total_charges        DECIMAL(12,2) GENERATED ALWAYS AS
                         (freight_charges + origin_charges + destination_charges) STORED,
  transit_time_days    INT,
  quote_validity_date  DATE,
  submitted_at         TIMESTAMP DEFAULT NOW()
);

-- Table: auction_activity_log
-- Immutable append-only log of everything that happened in an auction.
CREATE TABLE auction_activity_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id              UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  event_type          VARCHAR(30) NOT NULL
    CHECK (event_type IN ('bid_submitted','time_extended','auction_closed','force_closed')),
  description         TEXT,
  old_close_time      TIMESTAMP,
  new_close_time      TIMESTAMP,
  triggered_by_bid_id UUID REFERENCES bids(id),
  created_at          TIMESTAMP DEFAULT NOW()
);


-- Partial index: only index active auctions.
-- The timer service queries active auctions constantly.
-- A full index on all 100k rows wastes time — we only care about the
-- handful of rows where status = 'active'.
CREATE INDEX idx_active_rfqs
  ON rfqs(bid_close_time)
  WHERE status = 'active';

-- Covering index for the bid ranking query.
-- ORDER BY total_charges ASC is the hottest query on this table.
CREATE INDEX idx_bids_rfq_total
  ON bids(rfq_id, total_charges ASC);

CREATE INDEX idx_log_rfq_id
  ON auction_activity_log(rfq_id, created_at DESC);

-- ============================================================
-- DB Trigger: auto-log every extension
-- Whenever bid_close_time changes on a row in rfqs,
-- Postgres fires this trigger and writes to auction_activity_log.
-- This means the application code never forgets to log an extension —
-- the database guarantees it.
CREATE OR REPLACE FUNCTION log_auction_extension()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bid_close_time IS DISTINCT FROM OLD.bid_close_time THEN
    INSERT INTO auction_activity_log
      (rfq_id, event_type, description, old_close_time, new_close_time)
    VALUES (
      NEW.id,
      'time_extended',
      'Auction extended: ' || OLD.bid_close_time::text || ' → ' || NEW.bid_close_time::text,
      OLD.bid_close_time,
      NEW.bid_close_time
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_extension
AFTER UPDATE OF bid_close_time ON rfqs
FOR EACH ROW EXECUTE FUNCTION log_auction_extension();
