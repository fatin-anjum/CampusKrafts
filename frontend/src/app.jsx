import React, { useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

export default function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const id = localStorage.getItem('id'); // <-- Grab the stored user ID on load
    
    // Pass everything back inside the auth object if a token exists
    return token ? { token, role, id } : null; 
  });

  // Track if we should show the 'login' or 'register' screen
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    setAuth(null);
  };

  return (
    <div>
      {!auth ? (
        isRegistering ? (
          <Register toggleView={() => setIsRegistering(false)} />
        ) : (
          <Login setAuth={setAuth} toggleView={() => setIsRegistering(true)} />
        )
      ) : (
        <Dashboard auth={auth} handleLogout={handleLogout} />
      )}
    </div>
  );
}