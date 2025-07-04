import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const formNames = {
  gad7: 'GAD-7 Anxiety',
  phq9: 'PHQ-9 Depression',
  'srs2-adult-self': 'SRS-2 Adult Self',
  'srs2-adult-informant': 'SRS-2 Adult Informant'
  // Add other form names here...
};

export default function ClientDashboard({ clientId, onLogout }) {
  const [assignedForms, setAssignedForms] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchAssignedForms = async () => {
    try {
      const { data } = await axios.get(`https://us-central1-forms-bd6c1.cloudfunctions.net/api/client-forms`, {
        params: { clientId }
      });
      setAssignedForms(data.assignedForms);  // This now includes form statuses
    } catch (error) {
      console.error("Error fetching assigned forms:", error);
    } finally {
      setLoading(false);
    }
  };

  if (clientId) {
    fetchAssignedForms();
  }
}, [clientId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-center">Your Assigned Forms</h1>
      {assignedForms.length === 0 ? (
        <p className="text-center">No forms assigned to you.</p>
      ) : (
        <ul className="list-disc list-inside space-y-3">
          {assignedForms.map((form) => (
            <li key={form.formId} className="flex justify-between items-center">
              <Link to={`/form/${form.formId}?client=${clientId}`} className="text-blue-600 hover:underline">
                {formNames[form.formId] || form.formId}
              </Link>
              <span className={`text-xs ${form.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                {form.status || 'Not Started'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onLogout}
        className="mt-6 bg-red-600 text-white py-2 px-4 rounded w-full"
      >
        Logout
      </button>
    </div>
  );
}

