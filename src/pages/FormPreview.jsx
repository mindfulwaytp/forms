import React from 'react';
import { useParams } from 'react-router-dom';
import DynamicFormRenderer from '../components/DynamicFormRenderer';

export default function FormPreview() {
  const { formName } = useParams();

  return (
    <div className="max-w-3xl mx-auto mt-10 opacity-80">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Preview: {formName.toUpperCase()}
      </h1>
      <DynamicFormRenderer formName={formName} readOnly={true} />
    </div>
  );
}
