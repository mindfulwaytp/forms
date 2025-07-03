// src/pages/FormFiller.jsx
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import DynamicFormRenderer from '../components/DynamicFormRenderer';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function FormFiller({ clientId: propClientId }) {
  const { formName } = useParams();
  const query = useQuery();
  const queryClientId = query.get('clientId');
  const clientId = propClientId || queryClientId;

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
