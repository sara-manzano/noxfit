import { useEffect, useState } from 'react';
import { isPersonalTraining, timeSlotOptions, trainingTypeOptions } from '../lib/forms.js';
import { gyms } from './MadridMap.jsx';
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
  loadAvailability,
  reservationsVersion,
  isSubmitting,
  trainers,
  members,
  isAdmin,
  isStandardTrainer,
  currentTrainer,
  center,
  onCenterChange,
}) => {
  const [values, setValues] = useState(initialValues);
  const [bookedBy, setBookedBy] = useState(isStandardTrainer ? 'trainer' : 'member');
  const [availability, setAvailability] = useState({});
  const activeTrainer = isStandardTrainer
    ? currentTrainer
    : trainers.find((trainer) => trainer.trainer_id === values.trainer_id);
  const trainerCenter = activeTrainer?.center || '';
  const centerChoices = trainerCenter ? gyms.filter((gym) => gym.name === trainerCenter) : gyms;
  const hasTrainerOptions = trainers.length > 0;
  const isTrainerBooking = bookedBy === 'trainer';
  const isTrainer = isAdmin || isStandardTrainer;

  useEffect(() => {
    if (trainerCenter && center !== trainerCenter) {
      onCenterChange(trainerCenter);
    }
  }, [trainerCenter, center]);

  useEffect(() => {
    if (!values.date || !loadAvailability) {
      setAvailability({});
      return undefined;
    }

    let cancelled = false;

    Promise.all(timeSlotOptions.map((slot) => loadAvailability(values.date, slot)
      .then((response) => [slot, Object.fromEntries(response.items.map((item) => [item.trainer_id, item]))])
      .catch(() => [slot, {}])))
      .then((entries) => {
        if (!cancelled) {
          setAvailability(Object.fromEntries(entries));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [values.date, reservationsVersion]);

  const hasPersonalTrainingAt = (slot) => {
    const slotAvailability = availability[slot] || {};

    if (activeTrainer) {
      return Boolean(slotAvailability[activeTrainer.trainer_id]?.has_personal_training);
    }

    const items = Object.values(slotAvailability);

    return items.length > 0 && items.every((item) => item.has_personal_training);
  };

  const visibleTimeSlots = timeSlotOptions.filter((slot) => !hasPersonalTrainingAt(slot));

  useEffect(() => {
    if (values.time_slot && !visibleTimeSlots.includes(values.time_slot)) {
      setValues((current) => ({ ...current, time_slot: '' }));
    }
  }, [visibleTimeSlots.join('|'), values.time_slot]);

  const isTrainerUnavailable = (trainerId) => {
    const slot = availability[values.time_slot]?.[trainerId];

    if (!slot) {
      return false;
    }

    return isPersonalTraining(values.activity_type) ? slot.reservations_count > 0 : !slot.available;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      booked_by: bookedBy,
      activity_type: values.activity_type,
      center,
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
    setValues(initialValues);
  };

  return (
    <section className="subpanel">
      <div className="section-heading">
        <h3>Nueva reserva</h3>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <div className="booker-switch">
          <span className="booker-switch-label">Reserva</span>
          <div className="booker-switch-control" role="group" aria-label="Quién hace la reserva">
            <button
              type="button"
              className={!isTrainerBooking ? 'is-active' : ''}
              aria-pressed={!isTrainerBooking}
              disabled={!isAdmin && isTrainerBooking}
              onClick={() => setBookedBy('member')}
            >
              Socio
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
                  {member.full_name}
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
                  <option
                    key={trainer.trainer_id}
                    value={trainer.trainer_id}
                    disabled={isTrainerUnavailable(trainer.trainer_id)}
                  >
                    {trainer.full_name} · {trainer.activity_type || 'Sin especialidad'}
                    {trainer.center ? ` · ${trainer.center}` : ''}
                    {isTrainerUnavailable(trainer.trainer_id) ? ' · No disponible' : ''}
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
          <span>Tipo de entrenamiento</span>
          <select name="activity_type" value={values.activity_type} onChange={handleChange} required>
            <option value="">Selecciona un tipo</option>
            {trainingTypeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Centro</span>
          <select name="center" value={center} onChange={(event) => onCenterChange(event.target.value)} required>
            {trainerCenter ? null : <option value="">Selecciona un centro</option>}
            {centerChoices.map((gym) => (
              <option key={gym.name} value={gym.name}>{gym.name} · {gym.address}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Fecha</span>
          <input name="date" type="date" value={values.date} onChange={handleChange} required />
        </label>

        <label className="field">
          <span>Franja</span>
          <select name="time_slot" value={values.time_slot} onChange={handleChange} required>
            <option value="">Selecciona una franja</option>
            {visibleTimeSlots.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </label>
        <button className="button button-primary" type="submit" disabled={isSubmitting}>Reservar</button>
      </form>
    </section>
  );
};