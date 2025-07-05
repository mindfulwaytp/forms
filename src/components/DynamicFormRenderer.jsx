import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import forms from '../forms';

export default function DynamicFormRenderer({ formName, readOnly = false, clientId }) {
  const form = forms[formName];

  if (!form) return <p className="text-center text-red-600 mt-6">Form not found: {formName}</p>;

  const [responses, setResponses] = useState(Array(form.questions.length).fill(''));
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();

  const QUESTIONS_PER_PAGE = 5;
  const totalPages = Math.ceil(form.questions.length / QUESTIONS_PER_PAGE);
  const startIdx = currentPage * QUESTIONS_PER_PAGE;
  const endIdx = startIdx + QUESTIONS_PER_PAGE;
  const currentQuestions = form.questions.slice(startIdx, endIdx);

  const handleChange = (index, value) => {
    if (readOnly) return;
    const selectedOption = form.options.find(opt => opt.value.toString() === value);
    if (!selectedOption) return;
    const newResponses = [...responses];
    newResponses[index] = {
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

      const res = await fetch(`${import.meta.env.VITE_API_BASE}/submit-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to submit form: ${errorText}`);
      }

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
        {currentQuestions.map((question, i) => {
          const globalIndex = startIdx + i;
          return (
            <div key={globalIndex}>
              <p className="mb-2 font-medium">{question}</p>
              <select
                value={responses[globalIndex]?.value ?? ""}
                onChange={(e) => handleChange(globalIndex, e.target.value)}
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
          );
        })}

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
            disabled={currentPage === 0}
            className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
          >
            Previous
          </button>

          {currentPage < totalPages - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Next
            </button>
          ) : (
            !readOnly && (
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Submit
              </button>
            )
          )}
        </div>
      </form>
    </div>
  );
}
