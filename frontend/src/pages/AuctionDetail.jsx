import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  api, formatINR, formatDT, getCountdown,
  statusColor, joinAuction, leaveAuction, getSocket,
} from '../utils/api';
import PriceHistoryChart from '../components/PriceHistoryChart';

const EVENT_COLORS = {
  bid_submitted: '#27ae60',
  time_extended: '#e67e22',
  auction_closed: '#7f8c8d',
  force_closed: '#c0392b',
};

export default function AuctionDetail() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCd]    = useState({ text: '', urgent: false });
  const [toast, setToast]     = useState(null);
  const [bidForm, setBidForm] = useState({ carrier_name:'', freight_charges:'', origin_charges:'', destination_charges:'', transit_time_days:'', quote_validity_date:'' });
  const [bidErr, setBidErr]   = useState('');
  const [bidOk, setBidOk]     = useState('');
  const [submitting, setSub]  = useState(false);
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/rfqs/${id}`);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    load();
    joinAuction(id);
    const s = getSocket();
    s.on('new_bid', () => load());
    s.on('auction_extended', (p) => {
      if (p.rfqId !== id) return;
      load();
      showToast(`⏱ Extended! New close: ${new Date(p.newCloseTime).toLocaleTimeString('en-IN')}`, 'orange');
    });
    s.on('auction_closed', (p) => {
      if (p.rfqId !== id) return;
      load();
      showToast(p.closeType === 'force_closed' ? '🔴 Force closed' : '✅ Auction closed', p.closeType === 'force_closed' ? 'red' : 'gray');
    });
    return () => { leaveAuction(id); s.off('new_bid'); s.off('auction_extended'); s.off('auction_closed'); };
  }, [id, load]);

  useEffect(() => {
    if (!data) return;
    const tick = () => setCd(getCountdown(data.rfq.bid_close_time));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data]);

  function showToast(msg, color) {
    clearTimeout(toastTimer.current);
    setToast({ msg, color });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  async function activate() {
    await api.post(`/rfqs/${id}/activate`);
    load();
  }

  async function submitBid(e) {
    e.preventDefault();
    setBidErr(''); setBidOk(''); setSub(true);
    try {
      await api.post('/bids', { rfq_id: id, ...bidForm });
      setBidOk('✅ Bid submitted successfully!');
      setBidForm({ carrier_name:'', freight_charges:'', origin_charges:'', destination_charges:'', transit_time_days:'', quote_validity_date:'' });
    } catch (err) {
      setBidErr(err.response?.data?.error || 'Failed to submit bid');
    } finally { setSub(false); }
  }

  if (loading) return <div style={S.center}>Loading auction...</div>;
  if (!data)   return <div style={S.center}>Auction not found</div>;

  const { rfq, config, bids, activity_log } = data;
  const isActive = rfq.status === 'active';

  const toastBg = { orange:'#fff7ed', red:'#fef2f2', gray:'#f8fafc' };
  const toastBorder = { orange:'#fed7aa', red:'#fca5a5', gray:'#e2e8f0' };
  const toastText = { orange:'#9a3412', red:'#991b1b', gray:'#475569' };

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ ...S.toast, background: toastBg[toast.color]||'#f8fafc', border:`1px solid ${toastBorder[toast.color]||'#e2e8f0'}`, color: toastText[toast.color]||'#475569' }}>
          {toast.msg}
        </div>
      )}

      <button style={S.back} onClick={() => navigate('/')}>← Back to Auctions</button>

      {/* Header */}
      <div style={S.headerCard}>
        <div>
          <code style={S.refTag}>{rfq.reference_id}</code>
          <h1 style={S.auctionName}>{rfq.name}</h1>
          <div style={S.meta}>
            <span>Bid close: <strong>{formatDT(rfq.bid_close_time)}</strong></span>
            <span style={{ marginLeft:20 }}>Hard deadline: <strong>{formatDT(rfq.forced_close_time)}</strong></span>
          </div>
        </div>
        <div style={S.headerRight}>
          <span style={{ ...S.statusBadge, background: statusColor(rfq.status)+'20', color: statusColor(rfq.status), border:`1px solid ${statusColor(rfq.status)}40` }}>
            {rfq.status.replace('_',' ')}
          </span>
          {isActive && (
            <div style={{ ...S.countdown, color: countdown.urgent ? '#c0392b' : '#2c2c2c', animation: countdown.urgent ? 'pulse 1s infinite' : 'none' }}>
              {countdown.text}
            </div>
          )}
          {rfq.status === 'upcoming' && (
            <button style={S.activateBtn} onClick={activate}>▶ Activate Auction</button>
          )}
        </div>
      </div>

      <div style={S.twoCol}>
        {/* Left */}
        <div>
          {/* Bids table */}
          <div style={S.card}>
            <div style={S.cardHdr}>
              <span style={S.cardTitle}>Supplier Bids</span>
              <span style={S.countBadge}>{bids.length} bids</span>
            </div>
            {bids.length === 0 ? (
              <p style={{ color:'#bbb', fontSize:13, padding:'20px 0' }}>No bids submitted yet. Be the first!</p>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr style={S.thead}>
                      {['Rank','Carrier','Freight','Origin','Dest','Total','Transit','Valid till'].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map(b => (
                      <tr key={b.id} style={{ ...S.tr, background: b.rank===1 ? '#f0fdf4' : '#fff' }}>
                        <td style={S.td}>
                          <span style={{ ...S.rank, background: b.rank===1?'#27ae60':b.rank===2?'#3498db':'#95a5a6', color:'#fff' }}>
                            L{b.rank}
                          </span>
                        </td>
                        <td style={{ ...S.td, fontWeight: b.rank===1?700:400 }}>{b.carrier_name}</td>
                        <td style={S.td}>{formatINR(b.freight_charges)}</td>
                        <td style={S.td}>{formatINR(b.origin_charges)}</td>
                        <td style={S.td}>{formatINR(b.destination_charges)}</td>
                        <td style={{ ...S.td, fontWeight:700, color: b.rank===1?'#27ae60':'#333' }}>{formatINR(b.total_charges)}</td>
                        <td style={S.td}>{b.transit_time_days ? `${b.transit_time_days} days` : '—'}</td>
                        <td style={S.td}>{b.quote_validity_date ? new Date(b.quote_validity_date).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Chart */}
          <div style={{ ...S.card, marginTop:16 }}>
            <div style={S.cardHdr}><span style={S.cardTitle}>L1 Price History</span></div>
            <PriceHistoryChart bids={bids} />
          </div>

          {/* Config */}
          {config && (
            <div style={{ ...S.card, marginTop:16 }}>
              <div style={S.cardHdr}><span style={S.cardTitle}>Auction Configuration</span></div>
              <div style={S.configGrid}>
                <ConfigItem label="Trigger window (X)" value={`${config.trigger_window_minutes} minutes`} />
                <ConfigItem label="Extension duration (Y)" value={`${config.extension_duration_minutes} minutes`} />
                <ConfigItem label="Trigger type" value={config.extension_trigger.replace(/_/g,' ')} />
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div>
          {isActive && (
            <div style={S.card}>
              <div style={S.cardHdr}><span style={S.cardTitle}>Submit Your Bid</span></div>
              <form onSubmit={submitBid}>
                <Field label="Carrier / Company Name *">
                  <input style={S.input} value={bidForm.carrier_name}
                    onChange={e => setBidForm({...bidForm, carrier_name: e.target.value})}
                    placeholder="e.g. Blue Dart Logistics" required />
                </Field>
                <Field label="Freight Charges (₹) *">
                  <input style={S.input} type="number" value={bidForm.freight_charges}
                    onChange={e => setBidForm({...bidForm, freight_charges: e.target.value})}
                    placeholder="0" min={0} required />
                </Field>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <Field label="Origin Charges (₹)">
                    <input style={S.input} type="number" value={bidForm.origin_charges}
                      onChange={e => setBidForm({...bidForm, origin_charges: e.target.value})} min={0} placeholder="0" />
                  </Field>
                  <Field label="Destination Charges (₹)">
                    <input style={S.input} type="number" value={bidForm.destination_charges}
                      onChange={e => setBidForm({...bidForm, destination_charges: e.target.value})} min={0} placeholder="0" />
                  </Field>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <Field label="Transit Time (days)">
                    <input style={S.input} type="number" value={bidForm.transit_time_days}
                      onChange={e => setBidForm({...bidForm, transit_time_days: e.target.value})} min={1} placeholder="e.g. 3" />
                  </Field>
                  <Field label="Quote Valid Until">
                    <input style={S.input} type="date" value={bidForm.quote_validity_date}
                      onChange={e => setBidForm({...bidForm, quote_validity_date: e.target.value})} />
                  </Field>
                </div>
                {bidErr && <div style={S.errBox}>{bidErr}</div>}
                {bidOk  && <div style={S.okBox}>{bidOk}</div>}
                <button type="submit" style={S.bidBtn} disabled={submitting}>
                  {submitting ? 'Submitting...' : '🔨 Submit Bid'}
                </button>
              </form>
            </div>
          )}

          {/* Activity log */}
          <div style={{ ...S.card, marginTop: isActive ? 16 : 0 }}>
            <div style={S.cardHdr}><span style={S.cardTitle}>Activity Log</span></div>
            {activity_log.length === 0 ? (
              <p style={{ color:'#bbb', fontSize:13 }}>No activity yet.</p>
            ) : (
              <div>
                {activity_log.map(e => (
                  <div key={e.id} style={S.logEntry}>
                    <div style={{ width:9, height:9, borderRadius:'50%', background: EVENT_COLORS[e.event_type]||'#95a5a6', flexShrink:0, marginTop:4 }} />
                    <div>
                      <div style={{ fontSize:13, color:'#333' }}>{e.description}</div>
                      <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                        {new Date(e.created_at).toLocaleTimeString('en-IN')}
                        {e.event_type === 'time_extended' && e.new_close_time && (
                          <span style={{ color:'#e67e22', marginLeft:8, fontWeight:600 }}>
                            → New close: {formatDT(e.new_close_time)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>{label}</label>
      {children}
    </div>
  );
}

function ConfigItem({ label, value }) {
  return (
    <div style={{ background:'#f9f9f9', border:'1px solid #eee', borderRadius:8, padding:'10px 14px' }}>
      <div style={{ fontSize:11, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, color:'#c0392b', textTransform:'capitalize' }}>{value}</div>
    </div>
  );
}

const S = {
  page:        { maxWidth:1200, margin:'0 auto', padding:'24px' },
  center:      { textAlign:'center', padding:80, color:'#888' },
  back:        { background:'none', border:'none', color:'#c0392b', fontSize:14, cursor:'pointer', marginBottom:20, padding:0, fontWeight:600 },
  toast:       { position:'fixed', top:20, right:20, padding:'12px 20px', borderRadius:8, fontSize:14, fontWeight:500, zIndex:1000, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' },
  headerCard:  { background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'20px 24px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  refTag:      { fontFamily:'monospace', fontSize:12, background:'#fdf5f5', padding:'2px 8px', borderRadius:4, color:'#c0392b', border:'1px solid #f5c6c6' },
  auctionName: { fontSize:22, fontWeight:700, color:'#2c2c2c', margin:'8px 0 6px' },
  meta:        { fontSize:13, color:'#888' },
  headerRight: { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 },
  statusBadge: { display:'inline-block', padding:'4px 12px', borderRadius:20, fontSize:13, fontWeight:600, textTransform:'capitalize' },
  countdown:   { fontSize:30, fontWeight:700, fontVariantNumeric:'tabular-nums' },
  activateBtn: { background:'#27ae60', color:'#fff', border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, cursor:'pointer', fontWeight:600 },
  twoCol:      { display:'grid', gridTemplateColumns:'1fr 360px', gap:16, alignItems:'start' },
  card:        { background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' },
  cardHdr:     { display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:12, borderBottom:'1px solid #f0f0f0' },
  cardTitle:   { fontSize:15, fontWeight:700, color:'#2c2c2c' },
  countBadge:  { background:'#fdf5f5', color:'#c0392b', fontSize:12, padding:'2px 8px', borderRadius:12, fontWeight:600, border:'1px solid #f5c6c6' },
  table:       { width:'100%', borderCollapse:'collapse', fontSize:13 },
  thead:       { background:'#fafafa' },
  th:          { padding:'10px 12px', textAlign:'left', fontWeight:600, color:'#666', borderBottom:'2px solid #eee', fontSize:11, textTransform:'uppercase' },
  tr:          { borderBottom:'1px solid #f5f5f5' },
  td:          { padding:'12px 12px', color:'#333', verticalAlign:'middle' },
  rank:        { display:'inline-block', padding:'2px 8px', borderRadius:12, fontSize:12, fontWeight:700 },
  configGrid:  { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 },
  input:       { width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:13, color:'#333', boxSizing:'border-box' },
  errBox:      { background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, padding:'8px 12px', color:'#c0392b', fontSize:13, marginBottom:10 },
  okBox:       { background:'#f0fdf4', border:'1px solid #86efac', borderRadius:6, padding:'8px 12px', color:'#16a34a', fontSize:13, marginBottom:10 },
  bidBtn:      { width:'100%', padding:'10px', borderRadius:6, border:'none', background:'#c0392b', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 },
  logEntry:    { display:'flex', gap:10, alignItems:'flex-start', marginBottom:14 },
};
