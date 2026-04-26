"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ViewState = 'landing' | 'login-role' | 'login-form' | 'register-form';
type Role = 'Resident' | 'Guard' | 'Admin' | null;

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>('landing');
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Login Form States
  const [wing, setWing] = useState('');
  const [subWing, setSubWing] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTwoWheeler, setRegTwoWheeler] = useState('');
  const [regFourWheeler, setRegFourWheeler] = useState('');
  const [regVehicleNo, setRegVehicleNo] = useState('');
  const [regMembersCount, setRegMembersCount] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [familyPhoto, setFamilyPhoto] = useState<File | null>(null);

  // Dropdown Options
  const wings = ['A', 'B', 'C'];
  const subWingsMap: Record<string, string[]> = {
    'A': ['A1', 'A2', 'A3'],
    'B': ['B1', 'B2', 'B3'],
    'C': ['C1', 'C2']
  };

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
  };

  useEffect(() => {
    generateCaptcha();
  }, [view]);

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setView('login-form');
  };

  // --- FLAT VALIDATION LOGIC ---
  const validateFlatNumber = (selectedWing: string, flat: string): string | null => {
    if (!flat.match(/^[1-3]\d{2}$/)) {
      return "Invalid Flat Number! Only 101-112, 201-212, and 301-312 are allowed.";
    }
    
    const floor = parseInt(flat.charAt(0));
    const number = parseInt(flat.substring(1));

    if (number < 1 || number > 12) {
      return "Invalid! Each floor only has flats from 01 to 12 (e.g., 101 to 112).";
    }

    if (selectedWing === 'C' && floor > 2) {
      return "Invalid! C Wing (C1, C2) only has 2 floors. Maximum flat number is 212.";
    }

    if (floor > 3) {
      return "Invalid! Building only has 3 floors.";
    }

    return null; // Valid
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (role === 'Resident') {
      const flatError = validateFlatNumber(wing, flatNo);
      if (flatError) {
        alert(flatError);
        return;
      }

      if (captchaInput !== captchaText) {
        alert("Invalid Captcha! Please try again.");
        generateCaptcha();
        setCaptchaInput('');
        return;
      }
    }

    if (role === 'Admin') {
      if (email === 'admin@ksp.com' && password === 'admin123') {
        router.push('/admin');
      } else {
        alert("Invalid Admin Credentials!");
      }
    } else if (role === 'Guard') {
      if (email === 'guard@ksp.com' && password === 'guard123') {
        router.push('/guard');
      } else {
        alert("Invalid Guard Credentials!");
      }
    } else {
      // Resident Login
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            email,
            password,
            wing,
            subWing,
            flatNo
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Login failed");
        }

        // Login successful, save to sessionStorage and route
        sessionStorage.setItem('currentResident', JSON.stringify(data.user));
        router.push('/resident');
        
      } catch (err: any) {
        alert(`Login Failed: ${err.message}`);
        generateCaptcha();
        setCaptchaInput('');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const flatError = validateFlatNumber(wing, flatNo);
    if (flatError) {
      alert(flatError);
      return;
    }
    
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', regName);
      formData.append('email', regEmail);
      formData.append('password', regPassword);
      formData.append('wing', wing);
      formData.append('subWing', subWing);
      formData.append('flatNo', flatNo);
      formData.append('twoWheelers', regTwoWheeler || '0');
      formData.append('fourWheelers', regFourWheeler || '0');
      formData.append('vehicleNos', regVehicleNo);
      formData.append('membersCount', regMembersCount || '2');
      
      if (passportPhoto) formData.append('passportPhoto', passportPhoto);
      if (familyPhoto) formData.append('familyPhoto', familyPhoto);

      const response = await fetch('/api/residents/register', {
        method: 'POST',
        body: formData
      });

      // Instead of directly doing .json(), we read it as text first to avoid the HTML parse crash
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Server returned non-JSON:", responseText);
        throw new Error("Server Error: Please make sure the backend API is running and not returning an error page. Check console for details.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to register");
      }

      alert('Registration submitted successfully! Request sent to Admin for Approval.');
      setRegName(''); setRegEmail(''); setRegTwoWheeler(''); setRegFourWheeler(''); setRegVehicleNo(''); setRegPassword('');
      setPassportPhoto(null); setFamilyPhoto(null);
      setView('landing');
    } catch (err: any) {
      alert(`Registration Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-container">
      {/* Landing View */}
      {view === 'landing' && (
        <div className="fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem', padding: '2rem' }}>
          
          {/* Hero Section */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', padding: 0, minHeight: '400px' }}>
            <div style={{ flex: '1 1 400px', padding: '4rem 3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary-color)', lineHeight: 1.2 }}>
                FutureNest<br/>Residency
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: 1.6 }}>
                Welcome to the future of smart living. FutureNest Residency is a premium gated community powered by the <strong>SecureGate 360 AI Platform</strong>. Experience automated security, seamless facility management, and a vibrant community life.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="glass-button" onClick={() => setView('login-role')} style={{ width: 'auto', padding: '12px 24px' }}>
                  Member Login
                </button>
                <button className="glass-button outline" onClick={() => setView('register-form')} style={{ width: 'auto', padding: '12px 24px' }}>
                  Register as Resident
                </button>
              </div>
            </div>
            
            <div style={{ flex: '1 1 500px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <img src="/residency.png" alt="FutureNest Residency" style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'; }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: 'white', textAlign: 'right', fontSize: '0.9rem' }}>
                A, B & C Wings • Premium Apartments
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
              <h3 style={{ marginBottom: '1rem' }}>AI-Powered Security</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Automatic number plate recognition (ANPR) and helmet detection at the main gate for enhanced safety.</p>
            </div>
            
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
              <h3 style={{ marginBottom: '1rem' }}>Smart Dashboard</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Pay maintenance, view traffic violation fines, and get society notices directly on your phone.</p>
            </div>
            
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌳</div>
              <h3 style={{ marginBottom: '1rem' }}>Premium Amenities</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Lush green central park, swimming pool, ample parking space, and a fully equipped clubhouse.</p>
            </div>
          </div>

          {/* Society Details */}
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--secondary-color)' }}>About Our Community</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: 1.8 }}>
              FutureNest Residency is structurally divided into three distinct wings: <strong>A Wing, B Wing, and C Wing</strong>, offering thoughtfully designed living spaces. With state-of-the-art surveillance and 24/7 smart guard tracking, we prioritize the peace of mind of every resident. Join us in building a secure, clean, and technologically advanced society.
            </p>
          </div>

        </div>
      )}

      {/* Login Role Selection View */}
      {view === 'login-role' && (
        <div className="glass-panel fade-in" style={{ padding: '3rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '2rem' }}>Select Your Role</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="glass-button outline" onClick={() => handleRoleSelect('Resident')}>👤 Resident</button>
            <button className="glass-button outline" onClick={() => handleRoleSelect('Guard')}>🛡️ Guard</button>
            <button className="glass-button outline" onClick={() => handleRoleSelect('Admin')}>👑 Admin</button>
          </div>
          <button className="glass-button" style={{ marginTop: '2rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }} onClick={() => setView('landing')}>
            ← Back
          </button>
        </div>
      )}

      {/* Login Form View */}
      {view === 'login-form' && (
        <div className="glass-panel fade-in" style={{ padding: '2.5rem', maxWidth: '450px', width: '100%' }}>
          <h2 className="text-center mb-4">{role} Login</h2>
          
          <form onSubmit={handleLoginSubmit}>
            {role === 'Resident' && (
              <>
                <div className="flex-row">
                  <div className="form-group">
                    <label>Wing</label>
                    <select className="glass-select" value={wing} onChange={(e) => { setWing(e.target.value); setSubWing(''); }} required>
                      <option value="">Select Wing</option>
                      {wings.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sub-Wing</label>
                    <select className="glass-select" value={subWing} onChange={(e) => setSubWing(e.target.value)} disabled={!wing} required>
                      <option value="">Select Sub-Wing</option>
                      {wing && subWingsMap[wing]?.map(sw => <option key={sw} value={sw}>{sw}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Flat Number</label>
                  <input type="number" className="glass-input" placeholder="e.g. 101, 212" value={flatNo} onChange={(e) => setFlatNo(e.target.value)} required />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email ID</label>
              <input 
                type="email" 
                className="glass-input" 
                placeholder="Enter email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="glass-input" 
                placeholder="Enter password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            {role === 'Resident' && (
              <div className="form-group">
                <label>Verification Captcha</label>
                <div className="captcha-box mb-2">
                  <span>{captchaText}</span>
                  <span className="captcha-refresh" onClick={generateCaptcha}>↻</span>
                </div>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Enter captcha" 
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  required 
                />
              </div>
            )}

            <button type="submit" className="glass-button mt-4" disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</button>
          </form>

          <p className="text-center mt-4" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span className="link" onClick={() => setView('login-role')}>Change Role</span>
            {' • '}
            <span className="link" onClick={() => setView('landing')}>Home</span>
          </p>
        </div>
      )}

      {/* Registration Form View */}
      {view === 'register-form' && (
        <div className="glass-panel fade-in" style={{ padding: '2.5rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
          <h2 className="text-center mb-4">Resident Registration</h2>
          <p className="text-center mb-4" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Only one registration allowed per flat. Requires Admin approval.
          </p>
          
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="glass-input" placeholder="Owner/Resident Name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Email ID</label>
              <input type="email" className="glass-input" placeholder="Official contact email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
            </div>

            <div className="flex-row">
              <div className="form-group">
                <label>Wing</label>
                <select className="glass-select" value={wing} onChange={(e) => { setWing(e.target.value); setSubWing(''); }} required>
                  <option value="">Select</option>
                  {wings.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sub-Wing</label>
                <select className="glass-select" value={subWing} onChange={(e) => setSubWing(e.target.value)} disabled={!wing} required>
                  <option value="">Select</option>
                  {wing && subWingsMap[wing]?.map(sw => <option key={sw} value={sw}>{sw}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Flat Number</label>
                <input type="number" className="glass-input" placeholder="e.g. 212" value={flatNo} onChange={(e) => setFlatNo(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label>No. of Family Members</label>
              <input type="number" min="1" className="glass-input" placeholder="e.g. 4" value={regMembersCount} onChange={(e) => setRegMembersCount(e.target.value)} required />
            </div>

            <div className="flex-row">
              <div className="form-group">
                <label>No. of 2 Wheelers</label>
                <input type="number" min="0" className="glass-input" placeholder="0" value={regTwoWheeler} onChange={(e) => setRegTwoWheeler(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>No. of 4 Wheelers</label>
                <input type="number" min="0" className="glass-input" placeholder="0" value={regFourWheeler} onChange={(e) => setRegFourWheeler(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label>Vehicle Numbers (Comma separated)</label>
              <input type="text" className="glass-input" placeholder="e.g. MH 05 AC 5623" value={regVehicleNo} onChange={(e) => setRegVehicleNo(e.target.value)} />
            </div>

            {/* NEW PHOTO INPUTS */}
            <div className="flex-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Passport Size Photo (Owner)</label>
                <input type="file" accept="image/*" className="glass-input" style={{ padding: '8px' }} onChange={(e) => setPassportPhoto(e.target.files?.[0] || null)} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Family Photo (Optional)</label>
                <input type="file" accept="image/*" className="glass-input" style={{ padding: '8px' }} onChange={(e) => setFamilyPhoto(e.target.files?.[0] || null)} />
              </div>
            </div>

            <div className="form-group mt-2">
              <label>Strong Password</label>
              <input type="password" className="glass-input" placeholder="Min 8 chars, 1 Uppercase, 1 Number, 1 Symbol" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
            </div>

            <button type="submit" className="glass-button mt-4" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit Registration'}</button>
          </form>

          <p className="text-center mt-4">
            <span className="link" onClick={() => setView('landing')}>← Back to Home</span>
          </p>
        </div>
      )}
    </div>
  );
}
