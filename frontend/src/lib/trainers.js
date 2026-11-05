export const resolveVisibleTrainers = ({ trainers, trainerDirectory, reservations }) => {
  if (trainers.length) {
    return trainers;
  }

  if (trainerDirectory.length) {
    return trainerDirectory;
  }

  const bookedTrainers = reservations
    .filter((reservation) => reservation.trainer?.trainer_id)
    .map((reservation) => [reservation.trainer.trainer_id, reservation.trainer]);

  return Array.from(new Map(bookedTrainers).values());
};
