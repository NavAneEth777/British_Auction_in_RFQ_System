import axios from 'axios';
import { io } from 'socket.io-client';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: `${BASE}/api` });

let socket = null;
export function getSocket() {
  if (!socket) socket = io(BASE);
  return socket;
}

export const joinAuction  = (id) => getSocket().emit('join_auction', id);
export const leaveAuction = (id) => getSocket().emit('leave_auction', id);

export function formatINR(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function getCountdown(closeTime) {
  const diff = new Date(closeTime) - Date.now();
  if (diff <= 0) return { text: 'Closed', urgent: false };
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return {
    text: m > 0 ? `${m}m ${s}s` : `${s}s`,
    urgent: diff < 120000, // pulse red under 2 minutes
  };
}

export function statusColor(status) {
  return { active:'#16a34a', closed:'#64748b', force_closed:'#dc2626', upcoming:'#d97706' }[status] || '#64748b';
}
