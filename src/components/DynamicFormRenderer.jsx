import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import forms from '../forms';

export default function DynamicFormRenderer({ formName, readOnly = false, clientId }) {
  const form = forms[formName];

  if (!form) return <p className="text-center text-red-600 mt-6">Form not found: {formName}</p>;

  const [responses, setResponses] = useState(Array(form.questions.length).fill(''));
  const navigate = useNavigate();

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
      body: JSON.stringify(payload),
    });

    console.log('Fetch response status:', res.status);

    const responseText = await res.text();
    console.log('Fetch response text:', responseText);

    if (!res.ok) {
      throw new Error(`Failed to submit form: ${responseText}`);
    }

    console.log('Form submitted successfully!');
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
        {form.questions.map((question, i) => (
          <div key={i}>
            <p className="mb-2 font-medium">{question}</p>
            <select
              value={responses[i]?.value ?? ""}
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
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Submit
          </button>
        )}
      </form>
    </div>
  );
}
