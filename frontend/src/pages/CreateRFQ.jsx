import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const TRIGGERS = [
  { value:'bid_received',    label:'Any bid in last X minutes' },
  { value:'any_rank_change', label:'Any rank change in last X minutes' },
  { value:'l1_rank_change',  label:'L1 (cheapest) supplier changes in last X minutes' },
];

export default function CreateRFQ() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name:'', bid_start_time:'', bid_close_time:'', forced_close_time:'', pickup_date:'',
    trigger_window_minutes:10, extension_duration_minutes:5, extension_trigger:'bid_received',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (new Date(form.forced_close_time) <= new Date(form.bid_close_time)) {
      return setError('Forced close time must be after bid close time');
    }
    setSaving(true);
    try {
      const res = await api.post('/rfqs', form);
      navigate(`/auction/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally { setSaving(false); }
  }

  const x = form.trigger_window_minutes;
  const y = form.extension_duration_minutes;

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.cardTop}>
          <h1 style={S.title}>Create New RFQ</h1>
          <p style={S.sub}>Set up a British Auction for supplier quotes</p>
        </div>

        <form onSubmit={submit}>
          <div style={S.section}>
            <div style={S.sectionLabel}>📋 Basic Information</div>

            <div style={S.field}>
              <label style={S.label}>RFQ Name *</label>
              <input style={S.input} value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Hyderabad to Chennai Q2 Freight" required />
            </div>

            <div style={S.row}>
              <div style={S.field}>
                <label style={S.label}>Bid Start Time *</label>
                <input style={S.input} type="datetime-local" value={form.bid_start_time}
                  onChange={e => set('bid_start_time', e.target.value)} required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Bid Close Time *</label>
                <input style={S.input} type="datetime-local" value={form.bid_close_time}
                  onChange={e => set('bid_close_time', e.target.value)} required />
              </div>
            </div>

            <div style={S.row}>
              <div style={S.field}>
                <label style={S.label}>Forced Close Time * <span style={{ color:'#888', fontWeight:400 }}>(hard deadline)</span></label>
                <input style={S.input} type="datetime-local" value={form.forced_close_time}
                  onChange={e => set('forced_close_time', e.target.value)} required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Pickup / Service Date</label>
                <input style={S.input} type="date" value={form.pickup_date}
                  onChange={e => set('pickup_date', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={S.section}>
            <div style={S.sectionLabel}>⚙️ Auction Extension Settings</div>
            <div style={S.configBox}>
              <div style={S.row}>
                <div style={S.field}>
                  <label style={S.label}>Trigger Window (X minutes)</label>
                  <input style={S.input} type="number" value={x} min={1} max={120}
                    onChange={e => set('trigger_window_minutes', e.target.value)} />
                  <span style={S.hint}>How close to end time to watch for activity</span>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Extension Duration (Y minutes)</label>
                  <input style={S.input} type="number" value={y} min={1} max={60}
                    onChange={e => set('extension_duration_minutes', e.target.value)} />
                  <span style={S.hint}>How much extra time to add when triggered</span>
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>What triggers the extension?</label>
                <div style={{ marginTop:6 }}>
                  {TRIGGERS.map(t => (
                    <label key={t.value} style={S.radioLabel}>
                      <input type="radio" name="trigger" value={t.value}
                        checked={form.extension_trigger === t.value}
                        onChange={() => set('extension_trigger', t.value)}
                        style={{ marginRight:8, accentColor:'#c0392b' }} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={S.exampleBox}>
                💡 <strong>Example:</strong> If a bid arrives within {x} minutes of close time → auction extends by {y} more minutes. Auction can never go past the forced close time.
              </div>
            </div>
          </div>

          {error && <div style={S.errBox}>⚠️ {error}</div>}

          <div style={S.actions}>
            <button type="button" style={S.cancelBtn} onClick={() => navigate('/')}>Cancel</button>
            <button type="submit" style={S.saveBtn} disabled={saving}>
              {saving ? 'Creating...' : 'Create RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const S = {
  page:       { maxWidth:700, margin:'0 auto', padding:'32px 24px' },
  card:       { background:'#fff', borderRadius:10, border:'1px solid #e0e0e0', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', overflow:'hidden' },
  cardTop:    { background:'#c0392b', padding:'24px 28px' },
  title:      { fontSize:22, fontWeight:700, color:'#fff', margin:'0 0 4px' },
  sub:        { color:'rgba(255,255,255,0.8)', fontSize:14, margin:0 },
  section:    { padding:'24px 28px', borderBottom:'1px solid #f0f0f0' },
  sectionLabel:{ fontSize:13, fontWeight:700, color:'#c0392b', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:16 },
  row:        { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  field:      { display:'flex', flexDirection:'column', marginBottom:14 },
  label:      { fontSize:13, fontWeight:600, color:'#444', marginBottom:5 },
  hint:       { fontSize:11, color:'#999', marginTop:4 },
  input:      { padding:'9px 12px', borderRadius:6, border:'1px solid #ddd', fontSize:14, color:'#333', width:'100%', boxSizing:'border-box', transition:'border 0.15s' },
  configBox:  { background:'#fdf5f5', border:'1px solid #f5c6c6', borderRadius:8, padding:20 },
  radioLabel: { display:'flex', alignItems:'center', fontSize:14, color:'#444', marginBottom:10, cursor:'pointer' },
  exampleBox: { background:'#fff3cd', border:'1px solid #ffc107', borderRadius:6, padding:'10px 14px', fontSize:13, color:'#664d03', marginTop:8 },
  errBox:     { margin:'0 28px 16px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, padding:'10px 14px', color:'#dc2626', fontSize:13 },
  actions:    { display:'flex', justifyContent:'flex-end', gap:12, padding:'20px 28px' },
  cancelBtn:  { padding:'10px 22px', borderRadius:6, border:'1px solid #ddd', background:'#fff', color:'#555', fontSize:14, cursor:'pointer' },
  saveBtn:    { padding:'10px 28px', borderRadius:6, border:'none', background:'#c0392b', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' },
};
