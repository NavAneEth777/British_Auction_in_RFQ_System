import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatINR, formatDT, statusColor } from '../utils/api';

export default function AuctionList() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/rfqs').then(r => setRfqs(r.data)).finally(() => setLoading(false));
    const t = setInterval(() => api.get('/rfqs').then(r => setRfqs(r.data)), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div style={S.center}>Loading auctions...</div>;

  return (
    <div style={S.page}>
      <div style={S.hdr}>
        <div>
          <h1 style={S.title}>All Auctions</h1>
          <p style={S.sub}>Live and past British Auction RFQs</p>
        </div>
        <button style={S.btn} onClick={() => navigate('/create')}>+ New RFQ</button>
      </div>

      {rfqs.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
          <p>No auctions yet.</p>
          <Link to="/create" style={{ color:'#c0392b', fontWeight:600 }}>Create your first RFQ →</Link>
        </div>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr style={S.thead}>
                {['RFQ ID','Name','Lowest Bid','Bids','Close Time','Forced Close','Status',''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rfqs.map(r => (
                <tr key={r.id} style={S.tr} onMouseEnter={e => e.currentTarget.style.background='#fff5f5'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                  <td style={S.td}><code style={S.code}>{r.reference_id}</code></td>
                  <td style={{ ...S.td, fontWeight:500 }}>{r.name}</td>
                  <td style={S.td}>
                    {r.lowest_bid
                      ? <strong style={{ color:'#27ae60' }}>{formatINR(r.lowest_bid)}</strong>
                      : <span style={{ color:'#bdc3c7', fontSize:13 }}>No bids yet</span>}
                  </td>
                  <td style={S.td}>{r.total_bids}</td>
                  <td style={S.td}>{formatDT(r.bid_close_time)}</td>
                  <td style={S.td}>{formatDT(r.forced_close_time)}</td>
                  <td style={S.td}>
                    <span style={{ ...S.badge, background: statusColor(r.status)+'20', color: statusColor(r.status), border:`1px solid ${statusColor(r.status)}40` }}>
                      {r.status.replace('_',' ')}
                    </span>
                  </td>
                  <td style={S.td}>
                    <Link to={`/auction/${r.id}`} style={S.viewLink}>View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const S = {
  page:     { maxWidth:1100, margin:'0 auto', padding:'32px 24px' },
  hdr:      { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  title:    { fontSize:26, fontWeight:700, color:'#2c2c2c', margin:0 },
  sub:      { color:'#888', marginTop:4, fontSize:14, margin:'4px 0 0' },
  btn:      { background:'#c0392b', color:'#fff', border:'none', borderRadius:6, padding:'10px 22px', fontSize:14, fontWeight:600, cursor:'pointer' },
  center:   { textAlign:'center', padding:80, color:'#888' },
  empty:    { textAlign:'center', padding:'60px 20px', color:'#666', background:'#fff', borderRadius:10, border:'1px solid #eee' },
  tableWrap:{ background:'#fff', borderRadius:10, border:'1px solid #e8e8e8', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  table:    { width:'100%', borderCollapse:'collapse', fontSize:14 },
  thead:    { background:'#fafafa' },
  th:       { padding:'12px 16px', textAlign:'left', fontWeight:600, color:'#555', borderBottom:'2px solid #eee', fontSize:12, textTransform:'uppercase', letterSpacing:'0.04em' },
  tr:       { borderBottom:'1px solid #f0f0f0', background:'#fff', transition:'background 0.15s' },
  td:       { padding:'14px 16px', color:'#333', verticalAlign:'middle' },
  code:     { fontFamily:'monospace', fontSize:12, background:'#f5f5f5', padding:'3px 8px', borderRadius:4, color:'#c0392b' },
  badge:    { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, textTransform:'capitalize' },
  viewLink: { color:'#c0392b', textDecoration:'none', fontWeight:600, fontSize:13 },
};
