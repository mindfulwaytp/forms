import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forms, formNames } from '../forms';

export default function DynamicFormRenderer({ formName, readOnly = false, clientId }) {
  const form = forms[formName];

  if (!form) return <p className="text-center text-red-600 mt-6">Form not found: {formName}</p>;

  const [responses, setResponses] = useState(Array(form.questions.length).fill(null));
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();

  const questionsPerPage = 20;
  const totalPages = Math.ceil(form.questions.length / questionsPerPage);

  const startIdx = currentPage * questionsPerPage;
  const currentQuestions = form.questions.slice(startIdx, startIdx + questionsPerPage);

  const handleChange = (index, value) => {
    if (readOnly) return;
    const selectedOption = form.options.find(opt => opt.value.toString() === value);
    if (!selectedOption) return;

    const newResponses = [...responses];
    newResponses[startIdx + index] = {
      label: selectedOption.label,
      value: selectedOption.value
    };
    setResponses(newResponses);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;

    try {
      const payload = {
        clientId,
        formId: formName,
        responses,
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE}/create-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      if (!res.ok) throw new Error(`Failed to submit form: ${responseText}`);

      alert('Form submitted successfully!');
      navigate(`/dashboard?id=${clientId}`);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error submitting form: ${error.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-md rounded p-6">
      <h2 className="text-2xl font-semibold mb-6">{form.title}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {currentQuestions.map((question, i) => (
          <div key={i}>
            <p className="mb-2 font-medium">{question}</p>
            <select
              value={responses[startIdx + i]?.value ?? ""}
              onChange={(e) => handleChange(i, e.target.value)}
              required={!readOnly}
              disabled={readOnly}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="" disabled>Select an option</option>
              {form.options.map((option, j) => (
                <option key={j} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {!readOnly && (
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
            >
              Previous
            </button>

            {currentPage < totalPages - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Submit
              </button>
            )}
          </div>
        )}

        <div className="text-center text-sm mt-4 text-gray-500">
          Page {currentPage + 1} of {totalPages}
        </div>
      </form>
    </div>
  );
}
