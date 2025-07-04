import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import DynamicFormRenderer from '../components/DynamicFormRenderer';

// Function to extract query parameters (clientId from URL)
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function FormFiller({ clientId: propClientId }) {
  const { formName } = useParams();  // Extract formName from URL params
  const query = useQuery();
  const queryClientId = query.get('clientId');  // Extract clientId from query string
  const clientId = propClientId || queryClientId;  // Prefer propClientId, else use queryClientId

  // Logs to verify if formName and clientId are correctly passed
  console.log("FormFiller is rendered with formName:", formName, "clientId:", clientId);

  // If formName or clientId is missing, show an error message
  if (!formName || !clientId) {
    return <p className="text-center mt-10 text-red-600">Invalid form or missing client ID.</p>;
  }

  // More detailed logs for formName and clientId values
  console.log("Form Name:", formName);  // Log formName to check if it's 'gad7' or others
  console.log("Client ID:", clientId);  // Log clientId to check if it's 'james_1751660311128'

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4 text-center">{formName.toUpperCase()} Form</h1>
      <DynamicFormRenderer formName={formName} readOnly={false} clientId={clientId} />
    </div>
  );
}
