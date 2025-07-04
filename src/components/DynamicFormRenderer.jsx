import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forms } from '../forms';

export default function DynamicFormRenderer({ formName, readOnly = false, clientId }) {
  // Log formName and check if it exists in forms
  console.log("Form Name:", formName);  // Log formName to verify it's passed correctly
  console.log("Available Forms Keys:", Object.keys(forms));  // Log the keys of the forms object

  const form = forms[formName];

  // If form is not found, log the error
  if (!form) {
    console.error("Form not found for formName:", formName);  // Log the error if formName is not in forms
    return <p className="text-center text-red-600 mt-6">Form not found: {formName}</p>;
  }

  const [responses, setResponses] = useState(Array(form.questions.length).fill(null));
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();

  const questionsPerPage = 20;
  const totalPages = Math.ceil(form.questions.length / questionsPerPage);

  const startIdx = currentPage * questionsPerPage;
  const currentQuestions = form.questions.slice(startIdx, startIdx + questionsPerPage);

const handleChange = (index, value) => {
  if (readOnly) return;

  // Find the selected option by matching the value
  const selectedOption = form.options.find(opt => opt.value.toString() === value);
  
  // If no selected option is found, log an error and exit the function
  if (!selectedOption) {
    console.error(`No selected option found for value: ${value}`);
    return;
  }

  // Log the selected option for debugging
  console.log(`Selected option:`, selectedOption);

  // Clone the responses array to avoid mutating the state directly
  const newResponses = [...responses];

  // Log the index being used and ensure it's within bounds
  console.log(`Updating response at index: ${startIdx + index}`);

  // Make sure the index is within bounds
  if (startIdx + index < 0 || startIdx + index >= responses.length) {
    console.error(`Index out of bounds: ${startIdx + index}`);
    return;
  }

  // Update the response at the appropriate index
  newResponses[startIdx + index] = {
    label: selectedOption.label,
    value: selectedOption.value
  };

  // Log the new responses array after updating
  console.log('Updated responses:', newResponses);

  // Update the state with the new responses array
  setResponses(newResponses);
};


const handleSubmit = async (e) => {
  e.preventDefault();
  if (readOnly) return;

  // Log the payload before submission
  const payload = {
    clientId,
    formId: formName,
    responses,
    timestamp: new Date().toISOString(),
  };

  // Log the payload to inspect its structure
  console.log("Submitting payload:", payload);

  try {
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
