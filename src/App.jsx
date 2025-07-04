import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import Login from './Login'; // Admin login (email/password)
import ClientLogin from './pages/ClientLogin'; // Client ID login
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import FormFiller from './pages/FormFiller';

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [assignedForms, setAssignedForms] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  const handleClientLogin = (id, forms) => {
    setClientId(id);
    setAssignedForms(forms);
  };

  const handleLogout = async () => {
    setClientId(null);
    setAssignedForms([]);
    if (user) await signOut(auth);
    setUser(null);
  };

  if (!authChecked) return <div>Checking auth...</div>;

  return (
    <Router>
      <Routes>
        {/* Admin Login */}
        <Route path="/login" element={<Login />} />

        {/* Client Login */}
        <Route
          path="/client-login"
          element={
            clientId ? (
              <Navigate to="/client" replace />
            ) : (
              <ClientLogin onLogin={handleClientLogin} />
            )
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={
            user?.email === 'ryne@mindfulway-therapy.com' ? (
              <AdminDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Client Dashboard */}
        <Route
          path="/client"
          element={
            clientId ? (
              <ClientDashboard
                clientId={clientId}
                assignedForms={assignedForms}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/client-login" replace />
            )
          }
        />

        {/* Form filler */}
        <Route path="/form/:formName" element={<FormFiller clientId={clientId} />} />

        {/* Redirect fallback */}
        <Route
          path="*"
          element={
            user?.email === 'ryne@mindfulway-therapy.com' ? (
              <Navigate to="/admin" replace />
            ) : clientId ? (
              <Navigate to="/client" replace />
            ) : (
              <Navigate to="/client-login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;