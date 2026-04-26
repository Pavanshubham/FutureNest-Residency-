"use client";
import React from 'react';

export default function ReceiptModal({ receiptData, onClose }: { receiptData: any, onClose: () => void }) {
  if (!receiptData) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '400px', background: '#eef2f3', color: '#333', borderRadius: '12px' }}>
        
        {/* Receipt Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px dashed #ccc', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ color: '#4facfe', margin: 0 }}>SecureGate 360</h2>
          <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>Payment Receipt</p>
        </div>

        {/* Receipt Body */}
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Date:</span>
            <strong>{new Date().toLocaleDateString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Transaction ID:</span>
            <strong>{receiptData.id || `TXN${Math.floor(Math.random() * 100000)}`}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Flat / Name:</span>
            <strong>{receiptData.flat || 'Resident'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Payment For:</span>
            <strong>{receiptData.reason || receiptData.month || 'Dues'}</strong>
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', color: '#333' }}>Total Paid</span>
            <strong style={{ fontSize: '1.5rem', color: '#00e676' }}>₹{receiptData.amount || 50}</strong>
          </div>
        </div>

        {/* Status Stamp */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <div style={{ display: 'inline-block', border: '3px solid #00e676', color: '#00e676', padding: '5px 15px', borderRadius: '5px', fontWeight: 'bold', transform: 'rotate(-5deg)', letterSpacing: '2px' }}>
            SUCCESSFUL
          </div>
        </div>

        {/* Action */}
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button onClick={() => window.print()} className="glass-button" style={{ background: '#4facfe', flex: 1, padding: '10px' }}>Print / Save PDF</button>
          <button onClick={onClose} className="glass-button outline" style={{ color: '#ff4b4b', borderColor: '#ff4b4b', flex: 1, padding: '10px' }}>Close</button>
        </div>

      </div>
    </div>
  );
}
