// src/pages/ClientLogin.jsx
import React, { useState } from 'react';

export default function ClientLogin({ onLogin }) {
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`http://localhost:8080/client-forms?clientId=${encodeURIComponent(clientId)}`);
      if (!res.ok) throw new Error('Invalid Client ID');
      const data = await res.json();
      onLogin(clientId, data.assignedForms || []);
    } catch {
      setError('Client ID not found. Please check and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-10 p-4 border rounded">
      <label htmlFor="clientId" className="block mb-2 font-bold">Enter your Client ID:</label>
      <input
        id="clientId"
        type="text"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="border p-2 w-full"
        required
      />
      {error && <p className="text-red-600 mt-2">{error}</p>}
      <button type="submit" className="mt-4 bg-blue-600 text-white py-2 px-4 rounded">Login</button>
    </form>
  );
}
