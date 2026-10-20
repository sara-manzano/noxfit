import { useState } from 'react';
import { createInitialState, normalizePayload } from '../lib/forms.js';

const renderInput = (field, value, handleChange) => {
  if (field.type === 'select') {
    return (
      <select name={field.name} value={value} onChange={handleChange} required={field.required}>
        <option value="">Selecciona una opción</option>
        {field.options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="checkbox-field">
        <input name={field.name} type="checkbox" checked={value} onChange={handleChange} />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <input
      name={field.name}
      type={field.type}
      value={value}
      onChange={handleChange}
      required={field.required}
      min={field.min}
      step={field.step}
    />
  );
};

export const AccountForm = ({ title, fields, onSubmit, isSubmitting }) => {
  const [values, setValues] = useState(() => createInitialState(fields));

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(normalizePayload(fields, values));
    setValues(createInitialState(fields));
  };

  return (
    <section className="subpanel">
      <div className="section-heading">
        <h3>{title}</h3>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        {fields.map((field) => (
          field.type === 'checkbox' ? (
            <div key={field.name} className="field field-checkbox">
              {renderInput(field, values[field.name], handleChange)}
            </div>
          ) : (
            <label key={field.name} className="field">
              <span>{field.label}</span>
              {renderInput(field, values[field.name], handleChange)}
            </label>
          )
        ))}

        <button className="button button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </section>
  );
};