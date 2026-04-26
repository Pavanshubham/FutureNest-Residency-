"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ReceiptModal from '@/components/ReceiptModal';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analytics' | 'ai-video' | 'maintenance' | 'approvals' | 'residents' | 'notifications'>('analytics');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [noticeSubject, setNoticeSubject] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeFile, setNoticeFile] = useState<File | null>(null);

  // Analytics states set to 0 as requested
  const [analytics, setAnalytics] = useState({ totalCollected: 0, totalPending: 0, finesCollected: 0, finesPending: 0 });

  // Modals
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Interactive States
  const [currentViolations, setCurrentViolations] = useState<any[]>([]);
  const [historyViolations, setHistoryViolations] = useState<any[]>([]);
  const [fineFilter, setFineFilter] = useState('');

  // Maintenance States
  const [newMaintenanceAmount, setNewMaintenanceAmount] = useState('2500');
  const [newMaintenanceMonth, setNewMaintenanceMonth] = useState('');
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [maintenanceFilter, setMaintenanceFilter] = useState('');

  // Residents & Approvals States
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [approvedResidents, setApprovedResidents] = useState<any[]>([]);

  // Load data from Real Database via API
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/residents?status=pending');
        if (res.ok) {
          setPendingApprovals(await res.json());
        }
      } catch (err) { console.error(err); }
    };

    const fetchApproved = async () => {
      try {
        const res = await fetch('/api/residents?status=approved');
        if (res.ok) {
          setApprovedResidents(await res.json());
        }
      } catch (err) { console.error(err); }
    };

    const fetchMaintenance = async () => {
      try {
        const res = await fetch('/api/maintenance?flatId=all');
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((d: any) => ({
            id: d.id,
            flat: d.flat ? `${d.flat.wing}-${d.flat.subWing}-${d.flat.flatNumber}` : 'N/A',
            name: d.flat?.user?.name || 'N/A',
            email: d.flat?.user?.email || 'N/A',
            month: d.monthYear,
            amount: d.amount,
            status: d.status
          }));
          setMaintenanceHistory(mapped);
        }
      } catch (err) { console.error(err); }
    };

    const fetchFines = async () => {
      try {
        const res = await fetch('/api/fines?flatId=all');
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((d: any) => ({
            id: d.id,
            plate: d.bikeNo,
            reason: d.reason,
            confidence: 'AI Detected', // Mocked or actual if added
            status: d.status,
            image: d.snapshotUrl,
            month: new Date(d.createdAt).toISOString().substring(0, 7)
          }));
          setHistoryViolations(mapped);
        }
      } catch (err) { console.error(err); }
    };

    const fetchAnalytics = async () => {
      try {
        const [resMaint, resFines] = await Promise.all([
          fetch('/api/maintenance?flatId=all'),
          fetch('/api/fines?flatId=all')
        ]);
        
        let maintTotal = 0, maintPending = 0, finesTotal = 0, finesPendingAmount = 0;
        
        if (resMaint.ok) {
          const mData = await resMaint.json();
          mData.forEach((m: any) => {
            if (m.status === 'PAID') maintTotal += Number(m.amount);
            else maintPending += Number(m.amount);
          });
        }
        
        if (resFines.ok) {
          const fData = await resFines.json();
          fData.forEach((f: any) => {
            if (f.status === 'PAID') finesTotal += Number(f.amount);
            else finesPendingAmount += Number(f.amount);
          });
        }
        
        setAnalytics({
          totalCollected: maintTotal,
          totalPending: maintPending,
          finesCollected: finesTotal,
          finesPending: finesPendingAmount
        });
      } catch (err) { console.error(err); }
    };

    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
    if (activeTab === 'approvals') {
      fetchPending();
    }
    if (activeTab === 'residents') {
      fetchApproved();
    }
    if (activeTab === 'maintenance') {
      fetchApproved();
      fetchMaintenance();
    }
    if (activeTab === 'ai-video') {
      fetchFines();
    }
  }, [activeTab]);

  const handleApproveResident = async (req: any) => {
    try {
      const res = await fetch(`/api/residents/${req.id}/approve`, { method: 'PATCH' });
      if (res.ok) {
        setPendingApprovals(pendingApprovals.filter(r => r.id !== req.id));
        alert("Resident Approved Successfully! Saved to Database.");
      } else {
        alert("Failed to approve resident.");
      }
    } catch (err) {
      alert("Error approving resident.");
    }
  };

  const handleRejectResident = async (id: string) => {
    if (confirm("Are you sure you want to reject and delete this registration?")) {
      try {
        const res = await fetch(`/api/residents/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setPendingApprovals(pendingApprovals.filter(r => r.id !== id));
          alert("Resident Registration Rejected & Deleted from Database.");
        } else {
          alert("Failed to reject resident.");
        }
      } catch (err) {
        alert("Error rejecting resident.");
      }
    }
  };

  const handleRemoveResident = async (id: string, flat: string) => {
    if (confirm(`Are you sure you want to remove the resident of flat ${flat}? This will mark the flat as empty in the Database.`)) {
      try {
        const res = await fetch(`/api/residents/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setApprovedResidents(approvedResidents.filter(r => r.id !== id));
          alert(`Resident removed from Database. Flat ${flat} is now empty.`);
        } else {
          alert("Failed to remove resident.");
        }
      } catch (err) {
        alert("Error removing resident.");
      }
    }
  };

  // Handle Video Upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('http://localhost:8000/process-video', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.violations && data.violations.length > 0) {
          setCurrentViolations(prev => [...prev, ...data.violations]);
          alert(`${data.violations.length} violations detected!`);
        } else {
          alert("No violations detected in this video.");
        }
      } else {
        throw new Error("API failed");
      }
    } catch (err) {
      setTimeout(() => {
        const mockViolation = {
          id: Date.now(),
          plate: 'MH 05 AC 5623',
          confidence: '98.5%',
          time: new Date().toLocaleTimeString(),
          image: '/violation.png'
        };
        setCurrentViolations(prev => [mockViolation, ...prev]);
        alert("Warning: AI Server not reachable. Showing a mock detection for demonstration.");
      }, 2000);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleApproveFine = async (violation: any) => {
    try {
      const res = await fetch('/api/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 50,
          reason: 'No Helmet',
          bikeNo: violation.plate,
          snapshotUrl: violation.image || violation.snapshot_url
        })
      });

      if (res.ok) {
        setCurrentViolations(prev => prev.filter(v => v.id !== violation.id));
        setHistoryViolations(prev => [{
          id: violation.id,
          plate: violation.plate,
          confidence: violation.confidence,
          status: 'Unpaid',
          image: violation.image || violation.snapshot_url,
          month: new Date().toISOString().substring(0, 7)
        }, ...prev]);
        alert("Fine of ₹50 approved and sent to Resident.");
      } else {
        alert("Failed to save fine.");
      }
    } catch (err) {
      console.error(err);
      alert("Error approving fine.");
    }
  };

  const handleRemoveViolation = (id: any) => {
    setCurrentViolations(prev => prev.filter(v => v.id !== id));
  };

  const handleSendNotice = async () => {
    if (!noticeSubject || !noticeMessage) {
      alert("Please fill both subject and message.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', noticeSubject);
      formData.append('message', noticeMessage);
      formData.append('type', 'GENERAL');
      if (noticeFile) {
        formData.append('file', noticeFile);
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert(`Notice Broadcasted to all Residents!\nSubject: ${noticeSubject}`);
        setNoticeSubject('');
        setNoticeMessage('');
        setNoticeFile(null);
      } else {
        alert("Failed to broadcast notice.");
      }
    } catch (err) {
      alert("Error broadcasting notice.");
    }
  };

  const handleGenerateMaintenance = async () => {
    if (!newMaintenanceMonth || !newMaintenanceAmount) {
      alert("Please provide both Month and Amount.");
      return;
    }
    
    // Logic: Only send to occupied flats based on approved residents list.
    if (approvedResidents.length === 0) {
      alert("No registered residents found. Cannot generate maintenance.");
      return;
    }

    const payload = approvedResidents.map((res: any) => ({
      flatId: res.flatId,
      email: res.email,
      month: newMaintenanceMonth,
      amount: newMaintenanceAmount
    }));

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: payload })
      });

      if (res.ok) {
        // Also update local state for UI
        const newRecords = approvedResidents.map((res: any) => ({
          id: Date.now() + Math.random(),
          flat: res.flat,
          name: res.name,
          email: res.email,
          month: newMaintenanceMonth,
          amount: Number(newMaintenanceAmount),
          status: 'Unpaid'
        }));

        setMaintenanceHistory(prev => [...newRecords, ...prev]);
        setAnalytics(prev => ({ ...prev, totalPending: prev.totalPending + (Number(newMaintenanceAmount) * newRecords.length) }));
        
        alert(`Maintenance for ${newMaintenanceMonth} generated and sent to ${newRecords.length} occupied flats. Empty flats were skipped.`);
        setNewMaintenanceMonth('');
      } else {
        alert("Failed to generate maintenance.");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating maintenance.");
    }
  };

  // Utilities
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("No data available to download!");
      return;
    }
    const excludeKeys = ['id', 'image', 'snapshot_url', 'snapshotUrl'];
    const keys = Object.keys(data[0]).filter(k => !excludeKeys.includes(k));
    
    const csvContent = [
      keys.map(k => k.toUpperCase()).join(','),
      ...data.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '1rem 2rem' }}>
      
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--primary-color)' }}>Admin Portal</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={`glass-button ${activeTab !== 'analytics' ? 'outline' : ''}`} onClick={() => setActiveTab('analytics')} style={{ padding: '8px 16px', width: 'auto' }}>Analytics</button>
          <button className={`glass-button ${activeTab !== 'ai-video' ? 'outline' : ''}`} onClick={() => setActiveTab('ai-video')} style={{ padding: '8px 16px', width: 'auto' }}>AI Video & Fines</button>
          <button className={`glass-button ${activeTab !== 'maintenance' ? 'outline' : ''}`} onClick={() => setActiveTab('maintenance')} style={{ padding: '8px 16px', width: 'auto' }}>Maintenance</button>
          <button className={`glass-button ${activeTab !== 'residents' ? 'outline' : ''}`} onClick={() => setActiveTab('residents')} style={{ padding: '8px 16px', width: 'auto' }}>All Residents</button>
          <button className={`glass-button ${activeTab !== 'approvals' ? 'outline' : ''}`} onClick={() => setActiveTab('approvals')} style={{ padding: '8px 16px', width: 'auto' }}>Approvals</button>
          <button className={`glass-button ${activeTab !== 'notifications' ? 'outline' : ''}`} onClick={() => setActiveTab('notifications')} style={{ padding: '8px 16px', width: 'auto' }}>Broadcast</button>
          <button className="glass-button outline" onClick={() => router.push('/')} style={{ padding: '8px 16px', width: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }}>Logout</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1200px' }}>
          
          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="fade-in">
              <h3 className="mb-4">Financial Analytics</h3>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '2rem', textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--text-secondary)' }}>Maintenance Collected</h4>
                  <h2 style={{ fontSize: '2.5rem', color: 'var(--success)' }}>₹{analytics.totalCollected}</h2>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '2rem', textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--text-secondary)' }}>Maintenance Pending</h4>
                  <h2 style={{ fontSize: '2.5rem', color: 'var(--danger)' }}>₹{analytics.totalPending}</h2>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '2rem', textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--text-secondary)' }}>Fines Collected</h4>
                  <h2 style={{ fontSize: '2.5rem', color: 'var(--primary-color)' }}>₹{analytics.finesCollected}</h2>
                </div>
                <div className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '2rem', textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--text-secondary)' }}>Fines Pending</h4>
                  <h2 style={{ fontSize: '2.5rem', color: 'var(--warning)', textShadow: '0 0 10px rgba(255,165,0,0.5)' }}>₹{analytics.finesPending}</h2>
                </div>
              </div>
            </div>
          )}

          {/* AI VIDEO & FINES */}
          {activeTab === 'ai-video' && (
            <div className="fade-in">
              <div className="glass-panel mb-4" style={{ padding: '2rem', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px' }}>
                <h3 className="mb-2">Upload CCTV Footage for AI Processing</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>YOLOv8 + EasyOCR will detect helmet-less riders automatically.</p>
                
                {isProcessing ? (
                  <div style={{ padding: '10px', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                    ⚙️ Processing Video... Please wait.
                  </div>
                ) : (
                  <>
                    <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: 'none' }} id="video-upload" />
                    <label htmlFor="video-upload" className="glass-button outline" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px', cursor: 'pointer' }}>
                      Select Video File
                    </label>
                  </>
                )}
              </div>

              <div className="glass-panel mb-4" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                <h3 className="mb-4" style={{ color: 'var(--danger)' }}>Current AI Violations (Pending Approval)</h3>
                {currentViolations.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No pending violations.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                        <th style={{ padding: '1rem' }}>Snapshot</th>
                        <th style={{ padding: '1rem' }}>Number Plate</th>
                        <th style={{ padding: '1rem' }}>Confidence</th>
                        <th style={{ padding: '1rem' }}>Time</th>
                        <th style={{ padding: '1rem' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentViolations.map(v => (
                        <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem' }}>
                            <div 
                              style={{ width: '100px', height: '60px', position: 'relative', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--primary-color)' }}
                              onClick={() => setSelectedImage(v.image || v.snapshot_url)}
                            >
                              <img src={v.image || v.snapshot_url} alt="Violation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', textAlign: 'center', padding: '2px' }}>🔍 View</div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{v.plate}</td>
                          <td style={{ padding: '1rem', color: 'var(--success)' }}>{v.confidence}</td>
                          <td style={{ padding: '1rem' }}>{v.time}</td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button className="glass-button" onClick={() => handleApproveFine(v)} style={{ padding: '6px 12px', width: 'auto', fontSize: '0.85rem' }}>Approve Fine</button>
                              <button className="glass-button outline" onClick={() => handleRemoveViolation(v.id)} style={{ padding: '6px 12px', width: 'auto', fontSize: '0.85rem', borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}>Remove</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3>Violation History</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-secondary)' }}>Filter by Month:</label>
                    <input type="month" className="glass-input" value={fineFilter} onChange={(e) => setFineFilter(e.target.value)} style={{ padding: '5px 10px', width: 'auto' }} />
                    <button 
                      className="glass-button outline" 
                      onClick={() => downloadCSV(fineFilter ? historyViolations.filter(v => v.month === fineFilter) : historyViolations, 'violation_history.csv')}
                      style={{ padding: '6px 12px', width: 'auto', fontSize: '0.85rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                    >
                      ⬇️ Download CSV
                    </button>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ padding: '1rem' }}>Snapshot</th>
                      <th style={{ padding: '1rem' }}>Number Plate</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                      <th style={{ padding: '1rem' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fineFilter ? historyViolations.filter(v => v.month === fineFilter) : [...historyViolations.filter(v => v.status === 'UNPAID' || v.status === 'Unpaid'), ...historyViolations.filter(v => v.status === 'PAID' || v.status === 'Paid').slice(0, 5)]).map(v => (
                      <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div 
                            style={{ width: '100px', height: '60px', position: 'relative', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--primary-color)' }}
                            onClick={() => setSelectedImage(v.image)}
                          >
                            <img src={v.image || v.snapshot_url} alt="Violation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{v.plate}</td>
                        <td style={{ padding: '1rem', color: (v.status === 'PAID' || v.status === 'Paid') ? 'var(--success)' : 'var(--danger)' }}>{v.status}</td>
                        <td style={{ padding: '1rem' }}>
                          {(v.status === 'PAID' || v.status === 'Paid') ? <button className="glass-button outline" onClick={() => setSelectedReceipt(v)} style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}>View Receipt</button> : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MAINTENANCE MGMT */}
          {activeTab === 'maintenance' && (
            <div className="fade-in">
              <div className="glass-panel mb-4" style={{ padding: '2rem' }}>
                <h3 className="mb-4">Add New Maintenance</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                    <label>Month & Year</label>
                    <input type="month" className="glass-input" value={newMaintenanceMonth} onChange={(e) => setNewMaintenanceMonth(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                    <label>Amount (₹)</label>
                    <input type="number" className="glass-input" value={newMaintenanceAmount} onChange={(e) => setNewMaintenanceAmount(e.target.value)} />
                  </div>
                  <button className="glass-button" onClick={handleGenerateMaintenance} style={{ flex: 1, minWidth: '200px', height: '46px' }}>Generate & Send</button>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3>Maintenance History</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-secondary)' }}>Filter by Month:</label>
                    <input type="month" className="glass-input" value={maintenanceFilter} onChange={(e) => setMaintenanceFilter(e.target.value)} style={{ padding: '5px 10px', width: 'auto' }} />
                    <button 
                      className="glass-button outline" 
                      onClick={() => downloadCSV(maintenanceFilter ? maintenanceHistory.filter(m => m.month === maintenanceFilter) : maintenanceHistory, 'maintenance_history.csv')}
                      style={{ padding: '6px 12px', width: 'auto', fontSize: '0.85rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                    >
                      ⬇️ Download CSV
                    </button>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ padding: '1rem' }}>Flat No</th>
                      <th style={{ padding: '1rem' }}>Name</th>
                      <th style={{ padding: '1rem' }}>Email ID</th>
                      <th style={{ padding: '1rem' }}>Month</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                      <th style={{ padding: '1rem' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(maintenanceFilter ? maintenanceHistory.filter(m => m.month === maintenanceFilter) : [...maintenanceHistory.filter(m => m.status === 'UNPAID' || m.status === 'Unpaid'), ...maintenanceHistory.filter(m => m.status === 'PAID' || m.status === 'Paid').slice(0, 5)]).map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', color: 'var(--primary-color)' }}>{m.flat}</td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{m.name}</td>
                        <td style={{ padding: '1rem' }}>{m.email}</td>
                        <td style={{ padding: '1rem' }}>{m.month}</td>
                        <td style={{ padding: '1rem', color: (m.status === 'PAID' || m.status === 'Paid') ? 'var(--success)' : 'var(--danger)' }}>{m.status}</td>
                        <td style={{ padding: '1rem' }}>
                          {(m.status === 'PAID' || m.status === 'Paid') ? <button className="glass-button outline" onClick={() => setSelectedReceipt(m)} style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}>View Receipt</button> : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALL RESIDENTS DIRECTORY */}
          {activeTab === 'residents' && (
            <div className="glass-panel fade-in" style={{ padding: '2rem', overflowX: 'auto' }}>
              <h3 className="mb-4">Registered Residents (Database)</h3>
              {approvedResidents.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No active residents currently. All flats are empty.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ padding: '1rem' }}>Flat No</th>
                      <th style={{ padding: '1rem' }}>Name</th>
                      <th style={{ padding: '1rem' }}>Email</th>
                      <th style={{ padding: '1rem' }}>Vehicles Details</th>
                      <th style={{ padding: '1rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedResidents.map(res => (
                      <tr key={res.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', color: 'var(--primary-color)' }}>{res.flat}</td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{res.name}</td>
                        <td style={{ padding: '1rem' }}>{res.email}</td>
                        <td style={{ padding: '1rem' }}>{res.vehicles}</td>
                        <td style={{ padding: '1rem' }}>
                          <button className="glass-button outline" onClick={() => handleRemoveResident(res.id, res.flat)} style={{ padding: '6px 12px', width: 'auto', fontSize: '0.85rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}>Remove / Mark Empty</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* RESIDENT APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="glass-panel fade-in" style={{ padding: '2rem', overflowX: 'auto' }}>
              <h3 className="mb-4">Pending Resident Registrations (Database)</h3>
              {pendingApprovals.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No pending approvals at the moment.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <th style={{ padding: '1rem' }}>Flat No</th>
                      <th style={{ padding: '1rem' }}>Name</th>
                      <th style={{ padding: '1rem' }}>Email</th>
                      <th style={{ padding: '1rem' }}>Vehicles Details</th>
                      <th style={{ padding: '1rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovals.map(req => (
                      <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', color: 'var(--primary-color)' }}>{req.flat}</td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{req.name}</td>
                        <td style={{ padding: '1rem' }}>{req.email}</td>
                        <td style={{ padding: '1rem' }}>{req.vehicles}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="glass-button" onClick={() => handleApproveResident(req)} style={{ padding: '6px 12px', width: 'auto', fontSize: '0.85rem' }}>Approve</button>
                            <button className="glass-button outline" onClick={() => handleRejectResident(req.id)} style={{ padding: '6px 12px', width: 'auto', fontSize: '0.85rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* BROADCAST NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="glass-panel fade-in" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
              <h3 className="mb-4">Broadcast Notice</h3>
              <div className="form-group">
                <label>Notice Subject</label>
                <input type="text" className="glass-input" value={noticeSubject} onChange={(e) => setNoticeSubject(e.target.value)} placeholder="e.g. Water Supply Update" />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea className="glass-input" rows={5} value={noticeMessage} onChange={(e) => setNoticeMessage(e.target.value)} placeholder="Write your notice here..."></textarea>
              </div>
              <div className="form-group">
                <label>Attachment (Optional)</label>
                <input type="file" className="glass-input" style={{ padding: '8px' }} accept=".pdf,.csv,.xlsx,.xls,image/*" onChange={(e) => setNoticeFile(e.target.files?.[0] || null)} />
                <small style={{ color: 'var(--text-secondary)' }}>You can upload PDF, Excel, CSV, or Image files.</small>
              </div>
              <button className="glass-button mt-4" onClick={handleSendNotice}>Send to All Residents</button>
            </div>
          )}

        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: 'relative', width: '80%', height: '80%', maxWidth: '800px', maxHeight: '600px' }} onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Large Violation Snapshot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

      {/* Receipt Viewer Modal */}
      <ReceiptModal receiptData={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
    </div>
  );
}
