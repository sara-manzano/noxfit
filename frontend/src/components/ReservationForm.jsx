import { useState } from 'react';
import { timeSlotOptions } from '../lib/forms.js';
import './ReservationForm.css';

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

export const ReservationForm = ({
  onSubmit,
  isSubmitting,
  trainers,
  members,
  isAdmin,
  isStandardTrainer,
  currentTrainer,
}) => {
  const defaultActivity = isStandardTrainer ? currentTrainer?.activity_type || '' : '';
  const [values, setValues] = useState({ ...initialValues, activity_type: defaultActivity });
  const [bookedBy, setBookedBy] = useState(isStandardTrainer ? 'trainer' : 'member');
  const hasTrainerOptions = trainers.length > 0;
  const isTrainerBooking = bookedBy === 'trainer';
  const isTrainer = isAdmin || isStandardTrainer;

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
      booked_by: bookedBy,
      activity_type: values.activity_type,
      date: values.date,
      time_slot: values.time_slot,
    };

    if (!isStandardTrainer) {
      payload.trainer_id = values.trainer_id;
    }

    if (isAdmin && !isTrainerBooking && values.reservation_id) {
      payload.reservation_id = values.reservation_id;
    }

    if (isTrainer) {
      payload.member_id = values.member_id;
    }

    await onSubmit(payload);
    setValues({ ...initialValues, activity_type: defaultActivity });
  };

  return (
    <section className="subpanel">
      <div className="section-heading">
        <h3>Nueva reserva</h3>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <div className="booker-switch">
          <span className="booker-switch-label">Reserva hecha por</span>
          <div className="booker-switch-control" role="group" aria-label="Quién hace la reserva">
            <button
              type="button"
              className={!isTrainerBooking ? 'is-active' : ''}
              aria-pressed={!isTrainerBooking}
              disabled={!isAdmin && isTrainerBooking}
              onClick={() => setBookedBy('member')}
            >
              Miembro
            </button>
            <button
              type="button"
              className={isTrainerBooking ? 'is-active' : ''}
              aria-pressed={isTrainerBooking}
              disabled={!isAdmin && !isTrainerBooking}
              onClick={() => setBookedBy('trainer')}
            >
              Entrenador
            </button>
          </div>
        </div>

        {isAdmin && !isTrainerBooking ? (
          <label className="field">
            <span>Código de reserva (opcional)</span>
            <input name="reservation_id" value={values.reservation_id} onChange={handleChange} />
          </label>
        ) : null}

        {isTrainer ? (
          <label className="field">
            <span>Socio</span>
            <select name="member_id" value={values.member_id} onChange={handleChange} required>
              <option value="">Selecciona un socio</option>
              {members.map((member) => (
                <option key={member.member_id} value={member.member_id}>
                  {member.full_name} · {member.member_id}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isStandardTrainer ? (
          <label className="field">
            <span>Entrenador</span>
            <input value={currentTrainer?.full_name || ''} readOnly />
          </label>
        ) : (
          <label className="field">
            <span>Entrenador</span>
            {hasTrainerOptions ? (
              <select name="trainer_id" value={values.trainer_id} onChange={handleChange} required>
                <option value="">Selecciona un entrenador</option>
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
                placeholder="Código del entrenador"
                required
              />
            )}
          </label>
        )}

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
        <button className="button button-primary" type="submit" disabled={isSubmitting}>Reservar</button>
      </form>
    </section>
  );
};