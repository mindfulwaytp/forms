import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import { forms } from '../forms';  // Import forms

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function FormFiller({ clientId: propClientId }) {
  const { formName } = useParams();
  const query = useQuery();
  const queryClientId = query.get('clientId');
  const clientId = propClientId || queryClientId;

  // Debugging: Log available forms
  console.log("Available Forms:", Object.keys(forms));  // Logs available form keys

  // Debugging: Log formName and clientId
  console.log("Form Name:", formName);  // Should log 'phq9'
  console.log("Client ID:", clientId);  // Should log 'james_1751660311128'

  if (!formName || !clientId) {
    console.error("Form or Client ID is missing:", formName, clientId);  // More detailed log
    return <p className="text-center mt-10 text-red-600">Invalid form or missing client ID.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4 text-center">{formName.toUpperCase()} Form</h1>
      <DynamicFormRenderer formName={formName} readOnly={false} clientId={clientId} />
    </div>
  );
}
