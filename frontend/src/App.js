import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AuctionList   from './pages/AuctionList';
import AuctionDetail from './pages/AuctionDetail';
import CreateRFQ     from './pages/CreateRFQ';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'system-ui, -apple-system, sans-serif' }}>
        <nav style={{ background:'#c0392b', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', position:'sticky', top:0, zIndex:100 }}>
          <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <Link to="/" style={{ textDecoration:'none', fontSize:18, fontWeight:700, color:'#fff', letterSpacing:'-0.3px' }}>
              🔨 AuctionRFQ
            </Link>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>British Auction System</span>
          </div>
        </nav>
        <Routes>
          <Route path="/"            element={<AuctionList />} />
          <Route path="/create"      element={<CreateRFQ />} />
          <Route path="/auction/:id" element={<AuctionDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
