import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { formNames } from "../forms";

export default function ClientDashboard() {
  const [searchParams] = useSearchParams();
  const [clientId, setClientId] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [assignedForms, setAssignedForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Get clientId from search params and store it in state
  useEffect(() => {
    const id = searchParams.get("id");
    setClientId(id);
    console.log("Extracted client ID from URL:", id);
  }, [searchParams]);

  // Fetch data after clientId is set
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE}/client-forms`, {
          params: { clientId },
        });
        console.log("Fetched dashboard data:", res.data);

        setClientInfo({
          firstName: res.data.clientName,
          clientId: res.data.clientId,
        });

        setAssignedForms(res.data.assignedForms || []);
        setSubmissions(res.data.submissions || []);
      } catch (error) {
        console.error("Error fetching client data:", error);
      }
    };

    if (clientId) fetchData();
  }, [clientId]);

  const getDisplayName = (formId) =>
    formNames[formId] ||
    formId.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    console.log("Rendering dashboard with assignedForms:", assignedForms);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Client Dashboard</h1>

      {clientInfo && (
        <div className="mb-6">
          <p><strong>Name:</strong> {clientInfo.firstName}</p>
          <p><strong>Client ID:</strong> {clientInfo.clientId}</p>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Assigned Forms</h2>
        <ul className="space-y-2">
          {assignedForms.length > 0 ? (
            assignedForms.map((form) => (
              <li key={form.formId}>
                <Link
                  to={`/form/${form.formId}?id=${clientId}`}
                  className="text-blue-600 hover:underline"
                >
                  {getDisplayName(form.formId)} ({form.status})
                </Link>
              </li>
            ))
          ) : (
            <p className="text-gray-600">No forms currently assigned.</p>
          )}
        </ul>
      </div>

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
