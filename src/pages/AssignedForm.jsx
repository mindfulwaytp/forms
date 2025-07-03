import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function AssignedForm() {
  const { formId } = useParams();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client");
  const navigate = useNavigate();

  const [formData, setFormData] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForm = async () => {
      if (!clientId || !formId) return;
      const docRef = doc(db, "forms", formId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setFormData(snapshot.data());
      }
      setLoading(false);
    };
    fetchForm();
  }, [clientId, formId]);

  const handleResponseChange = (e, index) => {
    const updatedResponses = [...responses];
    updatedResponses[index] = e.target.value;
    setResponses(updatedResponses);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post("http://localhost:8080/submit-form", {
        clientId,
        formId,
        responses,
      });

      navigate(`/dashboard?id=${clientId}`);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const formDisplayNames = {
    'srs2-adult-informant': 'SRS-2 Adult Informant',
    'gad7': 'GAD-7 Anxiety',
    'phq9': 'PHQ-9 Depression',
    // add others here
  };

  if (loading) return <p className="p-6">Loading form...</p>;
  if (!formData) return <p className="p-6">Form not found.</p>;

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-4">
        {formDisplayNames[formId] || formData.name || formId}
      </h1>

      {formData.questions &&
        formData.questions.map((question, index) => (
          <div key={index}>
            <label className="block mb-2">{question}</label>
            <input
              type="text"
              className="border p-2 w-full"
              required
              value={responses[index] || ""}
              onChange={(e) => handleResponseChange(e, index)}
            />
          </div>
        ))}

      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
      >
        Submit
      </button>
    </form>
  );
}
