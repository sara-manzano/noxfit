export const getRoleFlags = (session) => {
  const isTrainer = session.role === 'trainer';

  return {
    isMember: session.role === 'member',
    isTrainer,
    isAdmin: isTrainer && Boolean(session.user.is_admin),
    isStandardTrainer: isTrainer && !session.user.is_admin,
  };
};

export const getRoleLabel = ({ isAdmin, isTrainer }) => {
  if (isAdmin) {
    return 'Entrenador admin';
  }

  return isTrainer ? 'Entrenador' : 'Socio';
};
