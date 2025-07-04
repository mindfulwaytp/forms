import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import DynamicFormRenderer from '../components/DynamicFormRenderer';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function FormFiller({ clientId: propClientId }) {
  const { formName } = useParams();
  const query = useQuery();
  const queryClientId = query.get('clientId');
  const navigate = useNavigate();

  // State to handle clientId and loading
  const [clientId, setClientId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize clientId from prop, query, or sessionStorage
  useEffect(() => {
    const id = propClientId || queryClientId || sessionStorage.getItem('clientId');
    setClientId(id);
    setLoading(false); // Set loading to false once clientId is resolved
  }, [propClientId, queryClientId]);

  // If clientId is still null after loading, redirect to client login
  useEffect(() => {
    if (!loading && !clientId) {
      navigate('/client-login');  // Redirect to client login page if clientId is missing
    }
  }, [clientId, loading, navigate]);

  console.log("Form Name:", formName);  // Log formName to check if it's 'gad7'
  console.log("Client ID:", clientId);  // Log clientId to check if it's 'james_1751660311128'

  // Show loading spinner or message until clientId is resolved
  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  // If formName or clientId is missing, show an error
  if (!formName || !clientId) {
    return <p className="text-center mt-10 text-red-600">Invalid form or missing client ID.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4 text-center">{formName.toUpperCase()} Form</h1>
      <DynamicFormRenderer formName={formName} readOnly={false} clientId={clientId} />
    </div>
  );
}
