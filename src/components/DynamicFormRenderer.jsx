
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import forms from '../forms';

export default function DynamicFormRenderer({ formName, readOnly = false, clientId }) {
  const form = forms[formName];

  if (!form) return <p className="text-center text-red-600 mt-6">Form not found: {formName}</p>;

  const [responses, setResponses] = useState(Array(form.questions.length).fill(''));
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();

  const QUESTIONS_PER_PAGE = 20;
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

      console.log('Submitting form with payload:', payload);

      const res = await fetch(`${import.meta.env.VITE_API_BASE}/submit-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to submit form');

      navigate('/success');
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {currentQuestions.map((question, index) => {
        const questionIndex = startIdx + index;
        return (
          <div key={questionIndex}>
            <label className="block font-medium text-gray-700 mb-1">
              {question.prompt}
            </label>
            <select
              value={responses[questionIndex]?.value || ''}
              onChange={(e) => handleChange(questionIndex, e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select...</option>
              {form.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
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
          <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Submit
          </button>
        )}
      </div>
    </form>
  );
}
