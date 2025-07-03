import React from 'react';
import { useNavigate } from 'react-router-dom';
import NewClientForm from '../components/NewClientForm'; // Add this line

export default function AdminDashboard() {
  const navigate = useNavigate();
  const forms = ['gad7', 'phq9', 'brief2']; // Expand this list as needed

  const handlePreview = (formName) => {
    navigate(`/preview/${formName}`);
  };

  const handleShare = (formName) => {
    const url = `${window.location.origin}/form/${formName}`;
    navigator.clipboard.writeText(url);
    alert(`Link copied: ${url}`);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Add Client Creation Section */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Create New Client</h2>
        <NewClientForm />
      </section>

      {/* Keep your existing form table */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Available Forms</h2>
        <table className="w-full table-auto border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Form</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form, i) => (
              <tr key={i} className="text-center">
                <td className="p-2 border">{form.toUpperCase()}</td>
                <td className="p-2 border space-x-2">
                  <button
                    onClick={() => handlePreview(form)}
                    className="bg-blue-500 text-white px-4 py-1 rounded"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleShare(form)}
                    className="bg-green-500 text-white px-4 py-1 rounded"
                  >
                    Share Link
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
