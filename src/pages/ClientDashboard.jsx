import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { forms, formNames } from "../forms";

export default function ClientDashboard() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("id");
  const [clientInfo, setClientInfo] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [assignedForms, setAssignedForms] = useState([]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE}/client-info`, {
          params: { clientId },
        });
        setClientInfo(res.data.clientInfo);
        setSubmissions(res.data.submissions || []);
      } catch (error) {
        console.error("Error fetching client info:", error);
      }
    };

    fetchData();
  }, [clientId]);

  const getDisplayName = (formId) =>
    formNames[formId] || formId.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Client Dashboard</h1>

      {clientInfo && (
        <div className="mb-6">
          <p><strong>Name:</strong> {clientInfo.firstName} {clientInfo.lastName}</p>
          <p><strong>Client ID:</strong> {clientId}</p>
        </div>
      )}

<ul className="space-y-2">
  {assignedForms.map((formId) => (
    <li key={formId}>
      <Link
        to={`/form/${formId}?id=${clientId}`}
        className="text-blue-600 hover:underline"
      >
        {getDisplayName(formId)}
      </Link>
    </li>
  ))}
</ul>


      <div>
        <h2 className="text-xl font-semibold mb-2">Previous Submissions</h2>
        {submissions.length > 0 ? (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Form</th>
                <th className="border px-2 py-1">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((form, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{getDisplayName(form.formId)}</td>
                  <td className="border px-2 py-1">
                    {new Date(form.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-600">No submissions yet.</p>
        )}
      </div>
    </div>
  );
}
