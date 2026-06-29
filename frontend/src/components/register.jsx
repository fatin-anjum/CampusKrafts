import React, { useState } from 'react';

export default function Register({ toggleView }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');

    const res = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        email, 
        password, 
        role: 'student' // Enforces student account creation only
      }),
    });

    const data = await res.json();

    if (res.status === 201) {
      alert('Registration successful! You can now log in.');
      toggleView(); // Sends user back to the login screen
    } else {
      setMessage(data.error || data.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Student Sign Up</h2>
        <p className="auth-subtitle">Create your account to access the student dashboard</p>
        
        {message && (
          <div style={{ 
            background: '#fee2e2', 
            color: 'var(--color-danger)', 
            padding: '10px', 
            borderRadius: 'var(--radius-md)', 
            fontSize: '13px', 
            marginBottom: '16px',
            textAlign: 'center',
            border: '1px solid #fca5a5'
          }}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '16px' }}>
            <input 
              type="text" 
              placeholder="Full Name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <input 
              type="email" 
              placeholder="Student Email" 
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
            Sign Up
          </button>
        </form>
        
        <p style={{ marginTop: '24px', fontSize: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <span 
            style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '500' }} 
            onClick={toggleView}
          >
            Log In here
          </span>
        </p>
      </div>
    </div>
  );
}