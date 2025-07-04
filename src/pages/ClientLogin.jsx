import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClientLogin() {
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('Submitting client ID:', clientId);

    try {
      const res = await fetch(
        `https://us-central1-forms-bd6c1.cloudfunctions.net/api/client-forms?clientId=${encodeURIComponent(clientId)}`
      );
      console.log('Fetch response:', res);

      if (!res.ok) throw new Error('Invalid Client ID');

      const data = await res.json();
      console.log('Fetched data:', data);

      // ✅ Navigate to the dashboard with the client ID in query params
      navigate(`/client`);
    } catch (err) {
      console.error('Error during login:', err);
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
