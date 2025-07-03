import React, { useState } from 'react';

const availableForms = [
  { id: 'gad7', name: 'GAD-7 Anxiety' },
  { id: 'phq9', name: 'PHQ-9 Depression' },
  { id: 'srs2-adult-self', name: 'SRS-2 Adult Self' },
  { id: 'srs2-adult-informant', name: 'SRS-2 Adult Informant' },
];

export default function NewClientForm() {
  const [clientName, setClientName] = useState('');
  const [dob, setDob] = useState('');
  const [evalType, setEvalType] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [userType, setUserType] = useState('');
  const [selectedForms, setSelectedForms] = useState([]);
  const [generatedLinkBase, setGeneratedLinkBase] = useState(null);
  const [assignedForms, setAssignedForms] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const evalOptions = ['ADHD', 'ADHD + Autism', 'Autism'];
  const ageOptions = ['<16', '16+'];
  const userTypes = ['Parent', 'Informant', 'Self'];

  const handleCheckbox = (formId) => {
    setSelectedForms((prev) =>
      prev.includes(formId)
        ? prev.filter((id) => id !== formId)
        : [...prev, formId]
    );
  };

  const handleCreateClient = async () => {
    setCreating(true);
    setError('');
    setGeneratedLinkBase(null);
    setAssignedForms([]);
    try {
      const response = await fetch('http://localhost:8080/create-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName,
          dob,
          evalType,
          ageRange,
          userType,
          selectedForms,
        }),
      });

      if (!response.ok) throw new Error('Failed to create sheet');

      const data = await response.json();

      setGeneratedLinkBase(`/forms/filler?client=${encodeURIComponent(data.clientId)}&form=`);
      setAssignedForms(data.assignedForms || []);
    } catch (err) {
      console.error('Error creating client:', err);
      setError(err.message || 'Error creating client');
    }
    setCreating(false);
  };

  return (
    <div className="p-4 border rounded shadow-md bg-white max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Create New Client</h2>

      <div className="space-y-4 mb-4">
        <input
          type="text"
          placeholder="Client Name"
          className="w-full border px-3 py-2"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          required
        />
        <input
          type="date"
          className="w-full border px-3 py-2"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
        />
        <select
          className="w-full border px-3 py-2"
          value={evalType}
          onChange={(e) => setEvalType(e.target.value)}
          required
        >
          <option value="">Select Evaluation Type</option>
          {evalOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <select
          className="w-full border px-3 py-2"
          value={ageRange}
          onChange={(e) => setAgeRange(e.target.value)}
          required
        >
          <option value="">Select Age Range</option>
          {ageOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <select
          className="w-full border px-3 py-2"
          value={userType}
          onChange={(e) => setUserType(e.target.value)}
          required
        >
          <option value="">Select User Type</option>
          {userTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <p className="font-medium">Select forms to assign:</p>
        {availableForms.map((form) => (
          <label key={form.id} className="block mt-2">
            <input
              type="checkbox"
              value={form.id}
              onChange={() => handleCheckbox(form.id)}
              checked={selectedForms.includes(form.id)}
              className="mr-2"
            />
            {form.name}
          </label>
        ))}
      </div>

      {error && <p className="text-red-600 mb-2">{error}</p>}

      <button
        onClick={handleCreateClient}
        disabled={creating || selectedForms.length === 0 || !clientName}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        {creating ? 'Creating...' : 'Create Client & Generate Links'}
      </button>

      {assignedForms.length > 0 && generatedLinkBase && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Send these links to your client:</h3>
          <ul className="list-disc list-inside space-y-1">
            {assignedForms.map((formId) => {
              const form = availableForms.find((f) => f.id === formId);
              if (!form) return null;
              return (
                <li key={formId}>
                  <a
                    href={`${generatedLinkBase}${formId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {form.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
