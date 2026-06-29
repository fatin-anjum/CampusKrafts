import React, { useState } from 'react';

export default function Login({ setAuth, toggleView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await res.json();
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('id', data.id);
      setAuth(data);
    } else {
      alert(data.message || 'Invalid Credentials');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to access your classroom hub</p>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <input 
              type="email" 
              placeholder="Email address" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" style={{ background: 'var(--color-primary)', color: 'white', width: '100%', padding: '11px' }}>
            Sign In
          </button>
        </form>
        
        <p style={{ marginTop: '24px', fontSize: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>
          New to the portal?{' '}
          <span 
            style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '500', textDecoration: 'none' }} 
            onClick={toggleView}
          >
            Create an account
          </span>
        </p>
      </div>
    </div>
  );
}