import { useState } from 'react';
import { reservationStatusOptions, timeSlotOptions } from '../lib/forms.js';

const initialValues = {
  reservation_id: '',
  member_id: '',
  trainer_id: '',
  activity_type: '',
  date: '',
  time_slot: '',
  status: 'Confirmada',
  price: '',
};

export const ReservationForm = ({ onSubmit, isSubmitting, trainers, members, isAdmin }) => {
  const [values, setValues] = useState(initialValues);
  const hasTrainerOptions = trainers.length > 0;

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'trainer_id') {
      const selectedTrainer = trainers.find((trainer) => trainer.trainer_id === value);
      setValues((current) => ({
        ...current,
        trainer_id: value,
        activity_type: selectedTrainer?.activity_type || current.activity_type,
      }));
      return;
    }

    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      reservation_id: values.reservation_id,
      trainer_id: values.trainer_id,
      activity_type: values.activity_type,
      date: values.date,
      time_slot: values.time_slot,
      status: values.status,
      price: values.price === '' ? undefined : Number(values.price),
    };

    if (isAdmin) {
      payload.member_id = values.member_id;
    }

    await onSubmit(payload);
    setValues(initialValues);
  };

  return (
    <section className="subpanel">
      <div className="section-heading">
        <h3>Nueva reserva</h3>
        <p>Relaciona members y trainers con una franja horaria válida.</p>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Código</span>
          <input name="reservation_id" value={values.reservation_id} onChange={handleChange} required />
        </label>

        {isAdmin ? (
          <label className="field">
            <span>Member</span>
            <select name="member_id" value={values.member_id} onChange={handleChange} required>
              <option value="">Selecciona un member</option>
              {members.map((member) => (
                <option key={member.member_id} value={member.member_id}>
                  {member.full_name} · {member.member_id}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="field">
          <span>Trainer</span>
          {hasTrainerOptions ? (
            <select name="trainer_id" value={values.trainer_id} onChange={handleChange} required>
              <option value="">Selecciona un trainer</option>
              {trainers.map((trainer) => (
                <option key={trainer.trainer_id} value={trainer.trainer_id}>
                  {trainer.full_name} · {trainer.activity_type || 'Sin especialidad'}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="trainer_id"
              value={values.trainer_id}
              onChange={handleChange}
              placeholder="trainer-001"
              required
            />
          )}
        </label>

        <label className="field">
          <span>Actividad</span>
          <input name="activity_type" value={values.activity_type} onChange={handleChange} />
        </label>

        <label className="field">
          <span>Fecha</span>
          <input name="date" type="date" value={values.date} onChange={handleChange} required />
        </label>

        <label className="field">
          <span>Franja</span>
          <select name="time_slot" value={values.time_slot} onChange={handleChange} required>
            <option value="">Selecciona una franja</option>
            {timeSlotOptions.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Estado</span>
          <select name="status" value={values.status} onChange={handleChange}>
            {reservationStatusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Precio</span>
          <input name="price" type="number" min="0" step="1" value={values.price} onChange={handleChange} />
        </label>

        <button className="button button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registrando...' : 'Crear reserva'}
        </button>
      </form>
    </section>
  );
};