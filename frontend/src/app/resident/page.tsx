"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import ReceiptModal from '@/components/ReceiptModal';
import { useRouter } from 'next/navigation';

type ViewState = 'home' | 'maintenance' | 'fines';

export default function ResidentDashboard() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>('home');
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Modals State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  
  // Edit Profile State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editMembers, setEditMembers] = useState(2);
  const [newVehType, setNewVehType] = useState('2-WHEELER');
  const [newVehNo, setNewVehNo] = useState('');

  // Dynamic Resident State
  const [resident, setResident] = useState({
    name: "Loading...",
    flat: "Loading...",
    email: "loading@example.com",
    members: 0,
    vehicles: { twoWheelers: 0, fourWheelers: 0 }
  });

  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [fineRecords, setFineRecords] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Read dynamic session data from sessionStorage
    const storedStr = sessionStorage.getItem('currentResident');
    let currentResident = {
      name: "Rajesh Sharma",
      flat: "B-B2-202",
      email: "rajesh.sharma@example.com",
      members: 4,
      vehicles: { twoWheelers: 1, fourWheelers: 1 }
    }; // Default Mock if accessed directly

    if (storedStr) {
      currentResident = JSON.parse(storedStr);
      setEditMembers(currentResident.members || 2);
    }
    
    setResident(currentResident);

    // Fetch Notifications
    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const notices = await res.json();
          setNotifications(notices);
          const lastSeen = parseInt(localStorage.getItem(`lastSeenNoticeCount_${currentResident.email}`) || '0');
          setUnreadCount(Math.max(0, notices.length - lastSeen));
        }
      } catch (err) {}
    };
    fetchNotices();

    // Fetch Fines from Database
    const fetchFines = async () => {
      if (!currentResident.flatId) return;
      try {
        const res = await fetch(`/api/fines?flatId=${currentResident.flatId}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((item: any) => ({
            id: item.id,
            date: new Date(item.createdAt).toLocaleString(),
            bikeNo: item.bikeNo,
            reason: item.reason,
            amount: item.amount,
            status: item.status.toLowerCase(),
            image: item.snapshotUrl
          }));
          setFineRecords(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch fines", err);
      }
    };
    fetchFines();

    // Fetch Maintenance from Database
    const fetchMaintenance = async () => {
      if (!currentResident.flatId) return;
      try {
        const res = await fetch(`/api/maintenance?flatId=${currentResident.flatId}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((item: any) => ({
            id: item.id,
            month: item.monthYear,
            amount: item.amount,
            status: item.status.toLowerCase()
          }));
          setMaintenanceRecords(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch maintenance", err);
      }
    };
    fetchMaintenance();

  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('currentResident');
    router.push('/');
  };

  const handlePayment = async (amount: number, recordId: number, type: 'MAINTENANCE' | 'FINE') => {
    try {
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, receipt_id: `rcpt_${recordId}` })
      });
      const order = await response.json();

      const options = {
        key: "rzp_test_SgS0C6K78awCI9",
        amount: order.amount,
        currency: order.currency,
        name: "SecureGate 360",
        description: `${type} Payment for Flat ${resident.flat}`,
        order_id: order.id,
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              type,
              recordId
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyData.isOk) {
            alert(`Payment of ₹${amount} successful! Receipt will be emailed to you.`);
            if (type === 'MAINTENANCE') {
              setMaintenanceRecords(prev => prev.map(m => m.id === recordId ? { ...m, status: 'paid' } : m));
            } else {
              setFineRecords(prev => prev.map(f => f.id === recordId ? { ...f, status: 'paid' } : f));
            }
          } else {
            alert("Payment Verification Failed!");
          }
        },
        prefill: { name: resident.name, email: resident.email },
        theme: { color: "#4facfe" }
      };

      // @ts-ignore
      const rzp1 = new window.Razorpay(options);
      rzp1.open();

    } catch (err) {
      console.error(err);
      alert("Error processing payment.");
    }
  };

  const handleUpdateProfile = async () => {
    // @ts-ignore
    if (!resident.flatId) {
      alert("Please relogin to update profile.");
      return;
    }
    try {
      const payload = {
        // @ts-ignore
        flatId: resident.flatId,
        membersCount: editMembers,
        newVehicles: newVehNo ? [{ type: newVehType, number: newVehNo }] : []
      };

      const res = await fetch('/api/residents/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        const updatedResident = {
          ...resident,
          members: data.membersCount,
          vehicles: data.vehicles
        };
        setResident(updatedResident);
        sessionStorage.setItem('currentResident', JSON.stringify(updatedResident));
        
        alert("Profile updated successfully!");
        setShowEditProfile(false);
        setNewVehNo(''); // reset
      } else {
        alert("Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating profile.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '1rem 2rem' }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        
        {/* Left: Notifications */}
        <div style={{ position: 'relative' }}>
          <button 
            className="glass-button outline" 
            style={{ padding: '10px 15px', borderRadius: '50%', position: 'relative' }}
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) {
                setUnreadCount(0);
                localStorage.setItem(`lastSeenNoticeCount_${resident.email}`, notifications.length.toString());
              }
            }}
          >
            🔔
            {unreadCount > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.7rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{unreadCount}</span>}
          </button>
          
          {showNotifications && (
            <div className="glass-panel fade-in" style={{ position: 'absolute', top: '50px', left: '0', width: '300px', padding: '1rem', zIndex: 10, maxHeight: '400px', overflowY: 'auto' }}>
              <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Notices & Alerts</h4>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No new notices.</p>
              ) : (
                notifications.map((n: any) => (
                  <div key={n.id} style={{ fontSize: '0.9rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                    <strong style={{ color: n.type === 'ALERT' ? 'var(--danger)' : 'var(--primary-color)' }}>{n.title}</strong>
                    <p style={{ marginTop: '5px' }}>{n.message}</p>
                    {n.attachmentUrl && (
                      <div style={{ marginTop: '8px' }}>
                        <a href={n.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--success)', textDecoration: 'none', fontSize: '0.85rem', border: '1px solid var(--success)', padding: '2px 8px', borderRadius: '12px', display: 'inline-block' }}>
                          📎 View {n.attachmentName || 'Attachment'}
                        </a>
                      </div>
                    )}
                    <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '5px' }}>{new Date(n.createdAt).toLocaleDateString()}</small>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Center: Title */}
        <h2 style={{ color: 'var(--primary-color)', cursor: 'pointer' }} onClick={() => setView('home')}>Resident Portal</h2>

        {/* Right: Profile */}
        <div style={{ position: 'relative' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '5px 15px', borderRadius: '30px' }}
            onClick={() => setShowProfile(!showProfile)}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4facfe', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
              {/* @ts-ignore */}
              {resident.passportPhoto ? <img src={resident.passportPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : resident.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 600 }}>{resident.flat}</span>
          </div>

          {showProfile && (
            <div className="glass-panel fade-in" style={{ position: 'absolute', top: '60px', right: '0', width: '250px', padding: '1.5rem', zIndex: 10 }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#4facfe', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '2rem', margin: '0 auto 0.5rem', overflow: 'hidden' }}>
                  {/* @ts-ignore */}
                  {resident.passportPhoto ? <img src={resident.passportPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : resident.name.charAt(0).toUpperCase()}
                </div>
                <h3 style={{ textTransform: 'capitalize' }}>{resident.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{resident.email}</p>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p>👨‍👩‍👧‍👦 Family Members: {resident.members}</p>
                <p>🏍️ 2-Wheelers: {resident.vehicles.twoWheelers}</p>
                <p>🚗 4-Wheelers: {resident.vehicles.fourWheelers}</p>
                <button className="glass-button outline mt-2" style={{ padding: '8px' }} onClick={() => setShowEditProfile(true)}>Update Profile</button>
                <button className="glass-button outline mt-2" style={{ padding: '8px', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={handleLogout}>Logout</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        
        {/* View: HOME */}
        {view === 'home' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '800px', width: '100%' }}>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', width: '100%', maxWidth: '600px' }}>
              <div style={{ width: '100%', height: '350px', position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
                {/* @ts-ignore */}
                <Image src={resident.familyPhoto || "/family.png"} alt="Family" layout="fill" objectFit="cover" />
              </div>
              <h3 className="text-center mt-4" style={{ textTransform: 'capitalize' }}>The {resident.name.split(' ')[0]} Family</h3>
              <p className="text-center" style={{ color: 'var(--text-secondary)' }}>Flat {resident.flat}</p>
            </div>

            <div className="flex-row" style={{ width: '100%', maxWidth: '600px', gap: '2rem' }}>
              <button className="glass-button" style={{ padding: '1.5rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }} onClick={() => setView('maintenance')}>
                <span style={{ fontSize: '2rem' }}>💳</span> Maintenance
              </button>
              <button className="glass-button outline" style={{ padding: '1.5rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => setView('fines')}>
                <span style={{ fontSize: '2rem' }}>🚦</span> Fines & Violations
              </button>
            </div>
          </div>
        )}

        {/* View: MAINTENANCE */}
        {view === 'maintenance' && (
          <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '900px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2>Maintenance Dashboard</h2>
              <button className="glass-button outline" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setView('home')}>← Back</button>
            </div>
            
            {maintenanceRecords.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No maintenance records found for {resident.flat}.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ padding: '1rem' }}>Month/Year</th>
                    <th style={{ padding: '1rem' }}>Amount</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                    <th style={{ padding: '1rem' }}>Receipt</th>
                    <th style={{ padding: '1rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRecords.map(record => (
                    <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem' }}>{record.month}</td>
                      <td style={{ padding: '1rem' }}>₹{record.amount}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: record.status === 'paid' ? 'var(--success)' : 'var(--danger)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.8rem' }}>{record.status}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {record.status === 'paid' ? <button className="glass-button outline" onClick={() => setSelectedReceipt({...record, flat: resident.flat})} style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem' }}>View Receipt</button> : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button className="glass-button" disabled={record.status === 'paid'} style={{ width: 'auto', padding: '8px 16px', opacity: record.status === 'paid' ? 0.3 : 1, cursor: record.status === 'paid' ? 'not-allowed' : 'pointer' }} onClick={() => handlePayment(record.amount, record.id, 'MAINTENANCE')}>
                          {record.status === 'paid' ? 'Paid' : 'Pay Now'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* View: FINES */}
        {view === 'fines' && (
          <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '1000px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2>Traffic Fines Dashboard</h2>
              <button className="glass-button outline" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setView('home')}>← Back</button>
            </div>
            
            {fineRecords.length === 0 ? (
              <p style={{ color: 'var(--success)' }}>Great! You have no traffic violations for {resident.flat}.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ padding: '1rem' }}>AI Snapshot</th>
                    <th style={{ padding: '1rem' }}>Bike No & Date</th>
                    <th style={{ padding: '1rem' }}>Reason & Fine</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                    <th style={{ padding: '1rem' }}>Receipt</th>
                    <th style={{ padding: '1rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fineRecords.map(record => (
                    <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div 
                          style={{ width: '120px', height: '80px', position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--primary-color)' }}
                          onClick={() => setSelectedImage(record.image)}
                        >
                          <img src={record.image || '/violation.png'} alt="Violation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', textAlign: 'center', padding: '2px' }}>🔍 View</div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <strong>{record.bikeNo}</strong><br />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{record.date}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {record.reason}<br />
                        <strong style={{ color: 'var(--danger)' }}>₹{record.amount}</strong>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: record.status === 'paid' ? 'var(--success)' : 'var(--danger)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.8rem' }}>{record.status}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {record.status === 'paid' ? <button className="glass-button outline" onClick={() => setSelectedReceipt({...record, flat: resident.flat})} style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem' }}>View Receipt</button> : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button className="glass-button" disabled={record.status === 'paid'} style={{ width: 'auto', padding: '8px 16px', opacity: record.status === 'paid' ? 0.3 : 1, cursor: record.status === 'paid' ? 'not-allowed' : 'pointer' }} onClick={() => handlePayment(record.amount, record.id, 'FINE')}>
                          {record.status === 'paid' ? 'Paid' : 'Pay Now'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: 'relative', width: '80%', height: '80%', maxWidth: '800px', maxHeight: '600px' }} onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage || '/violation.png'} alt="Large Violation Snapshot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

      {/* Update Profile Modal */}
      {showEditProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel fade-in" style={{ padding: '2rem', maxWidth: '400px', width: '100%', position: 'relative' }}>
            <button onClick={() => setShowEditProfile(false)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Update Profile</h3>
            
            <div className="form-group mb-3">
              <label>Number of Family Members</label>
              <input type="number" min="1" className="glass-input" value={editMembers} onChange={e => setEditMembers(Number(e.target.value))} />
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1.5rem 0', paddingTop: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Add New Vehicle (Optional)</p>
              <div className="form-group mb-2">
                <label>Vehicle Type</label>
                <select className="glass-select" value={newVehType} onChange={e => setNewVehType(e.target.value)}>
                  <option value="2-WHEELER">2-Wheeler (Bike/Scooter)</option>
                  <option value="4-WHEELER">4-Wheeler (Car)</option>
                </select>
              </div>
              <div className="form-group mb-3">
                <label>Number Plate</label>
                <input type="text" className="glass-input" placeholder="e.g. MH12AB1234" value={newVehNo} onChange={e => setNewVehNo(e.target.value)} />
              </div>
            </div>

            <button className="glass-button w-100" onClick={handleUpdateProfile}>Save Changes</button>
          </div>
        </div>
      )}

      {/* Receipt Viewer Modal */}
      <ReceiptModal receiptData={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
    </div>
  );
}
