"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GuardDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'gate-out' | 'gate-in' | 'manual'>('gate-out'); // gate-out = entering, gate-in = exiting
  const [isProcessing, setIsProcessing] = useState(false);

  // States for Tables
  const [residentLogs, setResidentLogs] = useState<any[]>([]);
  const [visitorLogs, setVisitorLogs] = useState<any[]>([]);

  // Manual Visitor State
  const [newVisitor, setNewVisitor] = useState({ name: '', mobile: '', vehicleNo: '', flat: '' });

  // Modals
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
    // Set up polling for new entries
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/gate');
      if (res.ok) {
        const data = await res.json();
        
        // Split into Residents and Visitors
        const resLogs = data.filter((d: any) => d.isResident);
        const visLogs = data.filter((d: any) => !d.isResident);
        
        setResidentLogs(resLogs);
        setVisitorLogs(visLogs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, action: 'in' | 'out') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsProcessing(true);
    
    // 1. Send video to AI Service for Number Plate Detection
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const aiRes = await fetch('http://localhost:8000/process-gate', {
        method: 'POST',
        body: formData
      });
      
      const aiData = await aiRes.json();
      
      if (aiData.status === "success" && aiData.vehicles.length > 0) {
        // Just take the first detected vehicle for the gate entry
        const detected = aiData.vehicles[0];
        
        // 2. Send the detected plate to Next.js Backend to record Entry/Exit
        const recordRes = await fetch('/api/gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: action,
            plate: detected.plate,
            snapshotUrl: detected.snapshot_url
          })
        });

        if (recordRes.ok) {
          const recordData = await recordRes.json();
          alert(`${action === 'in' ? 'ENTRY' : 'EXIT'} Recorded for: ${detected.plate}\nStatus: ${recordData.isResident ? 'Resident' : 'Visitor'}`);
          fetchLogs();
        } else {
          alert("Failed to save entry in database.");
        }
      } else {
        alert("AI could not detect any valid number plates in the video.");
      }
    } catch (err) {
      console.error(err);
      alert("Error communicating with AI Service.");
    } finally {
      setIsProcessing(false);
      e.target.value = ''; // reset file input
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '1rem 2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--secondary-color)' }}>Guard Portal - Live Entries</h2>
        <div>
          <button className="glass-button outline" onClick={() => router.push('/')} style={{ padding: '8px 16px', borderColor: 'var(--danger)', color: 'var(--danger)', width: 'auto' }}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
        <button className={`glass-button ${activeTab !== 'gate-out' ? 'outline' : ''}`} onClick={() => setActiveTab('gate-out')} style={{ width: 'auto', padding: '10px 20px' }}>
          Gate-OUT Camera (Detects Entry 🟢)
        </button>
        <button className={`glass-button ${activeTab !== 'gate-in' ? 'outline' : ''}`} onClick={() => setActiveTab('gate-in')} style={{ width: 'auto', padding: '10px 20px' }}>
          Gate-IN Camera (Detects Exit 🔴)
        </button>
        <button className={`glass-button ${activeTab !== 'manual' ? 'outline' : ''}`} onClick={() => setActiveTab('manual')} style={{ width: 'auto', padding: '10px 20px' }}>
          Manual Visitor Entry
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        {activeTab === 'gate-out' && (
          <div className="glass-panel text-center fade-in" style={{ padding: '2rem', maxWidth: '500px', width: '100%', borderStyle: 'dashed', borderWidth: '2px', borderColor: 'var(--success)' }}>
            <h3 style={{ color: 'var(--success)', marginBottom: '1rem' }}>Vehicle Arriving (IN)</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Upload CCTV clip from Gate-OUT to detect incoming vehicles.</p>
            {isProcessing ? (
               <div style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>⚙️ AI is scanning video...</div>
            ) : (
              <>
                <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e, 'in')} style={{ display: 'none' }} id="upload-in" />
                <label htmlFor="upload-in" className="glass-button" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px', cursor: 'pointer' }}>
                  Select Video (Gate-OUT)
                </label>
              </>
            )}
          </div>
        )}

        {activeTab === 'gate-in' && (
          <div className="glass-panel text-center fade-in" style={{ padding: '2rem', maxWidth: '500px', width: '100%', borderStyle: 'dashed', borderWidth: '2px', borderColor: 'var(--danger)' }}>
            <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Vehicle Leaving (OUT)</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Upload CCTV clip from Gate-IN to detect exiting vehicles.</p>
            {isProcessing ? (
               <div style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>⚙️ AI is scanning video...</div>
            ) : (
              <>
                <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e, 'out')} style={{ display: 'none' }} id="upload-out" />
                <label htmlFor="upload-out" className="glass-button outline" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px', cursor: 'pointer', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                  Select Video (Gate-IN)
                </label>
              </>
            )}
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="glass-panel fade-in" style={{ padding: '2rem', maxWidth: '500px', width: '100%' }}>
            <h3 className="mb-4">Manual Visitor Entry</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Use this if the visitor is walking or AI fails to scan.</p>
            <div className="form-group">
              <label>Vehicle No (Optional)</label>
              <input type="text" className="glass-input" value={newVisitor.vehicleNo} onChange={e => setNewVisitor({...newVisitor, vehicleNo: e.target.value})} />
            </div>
            <button className="glass-button" onClick={() => {
              // Quick mock logic for manual
              alert("Feature coming soon! Use Video Upload for now.");
            }}>Add Manual Entry</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* Residents Table */}
        <div className="glass-panel" style={{ flex: '1 1 500px', padding: '1.5rem', overflowX: 'auto' }}>
          <h3 className="mb-4" style={{ color: 'var(--primary-color)' }}>Residents Movement</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <th style={{ padding: '1rem' }}>Month/Year</th>
                <th style={{ padding: '1rem' }}>Vehicle Number</th>
                <th style={{ padding: '1rem' }}>Time IN</th>
                <th style={{ padding: '1rem' }}>Time OUT</th>
              </tr>
            </thead>
            <tbody>
              {residentLogs.length === 0 ? <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>No resident logs yet.</td></tr> : null}
              {residentLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{log.monthYear}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{log.vehicleNo}</td>
                  <td style={{ padding: '1rem', color: 'var(--success)' }}>{formatTime(log.timeIn)}</td>
                  <td style={{ padding: '1rem', color: 'var(--danger)' }}>{formatTime(log.timeOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visitors Table */}
        <div className="glass-panel" style={{ flex: '1 1 500px', padding: '1.5rem', overflowX: 'auto' }}>
          <h3 className="mb-4" style={{ color: 'var(--warning)' }}>Visitors Movement</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <th style={{ padding: '1rem' }}>Month/Year</th>
                <th style={{ padding: '1rem' }}>Vehicle Number</th>
                <th style={{ padding: '1rem' }}>Snapshot</th>
                <th style={{ padding: '1rem' }}>Time IN</th>
                <th style={{ padding: '1rem' }}>Time OUT</th>
              </tr>
            </thead>
            <tbody>
              {visitorLogs.length === 0 ? <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>No visitor logs yet.</td></tr> : null}
              {visitorLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{log.monthYear}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{log.vehicleNo}</td>
                  <td style={{ padding: '1rem' }}>
                    {log.snapshotUrl ? (
                      <div 
                        style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid white', overflow: 'hidden', borderRadius: '4px' }}
                        onClick={() => setSelectedImage(log.snapshotUrl)}
                      >
                        <img src={log.snapshotUrl} alt="Snap" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--success)' }}>{formatTime(log.timeIn)}</td>
                  <td style={{ padding: '1rem', color: 'var(--danger)' }}>{formatTime(log.timeOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Snapshot Viewer Modal */}
      {selectedImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: 'relative', width: '80%', height: '80%', maxWidth: '800px', maxHeight: '600px' }} onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Large Snapshot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            <button 
              className="glass-button" 
              style={{ position: 'absolute', top: '-40px', right: '-40px', width: '40px', height: '40px', padding: 0, borderRadius: '50%', background: 'var(--danger)', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
