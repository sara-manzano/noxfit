import { useEffect, useState } from 'react';
import { accountsApi, reservationsApi } from '../api/client.js';
import { useDismissibleMessage } from './useDismissibleMessage.js';

const emptyWorkspace = {
  profile: null,
  members: [],
  trainers: [],
  reservations: [],
};

export const useDashboardData = (session) => {
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const [isLoading, setIsLoading] = useState(Boolean(session));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useDismissibleMessage(notice, () => setNotice(''));

  const refreshData = async () => {
    if (!session?.token) {
      setWorkspace(emptyWorkspace);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (session.role === 'trainer' && session.user.is_admin) {
        const [profile, members, trainers, reservations] = await Promise.all([
          accountsApi.getProfile(session),
          accountsApi.listMembers(session),
          accountsApi.listTrainers(session),
          reservationsApi.list(session),
        ]);

        setWorkspace({
          profile,
          members: members.items,
          trainers: trainers.items,
          reservations: reservations.items,
        });
        return;
      }

      if (session.role === 'member') {
        const [profile, reservations] = await Promise.all([
          accountsApi.getProfile(session),
          reservationsApi.list(session),
        ]);

        setWorkspace({
          profile,
          members: [],
          trainers: [],
          reservations: reservations.items,
        });
        return;
      }

      const profile = await accountsApi.getProfile(session);
      setWorkspace({
        profile,
        members: [],
        trainers: [],
        reservations: [],
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [session?.role, session?.token, session?.user?.is_admin]);

  const runMutation = async (operation, successMessage) => {
    setIsSubmitting(true);
    setError('');

    try {
      await operation();
      await refreshData();
      setNotice(successMessage);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    ...workspace,
    isLoading,
    isSubmitting,
    error,
    notice,
    clearError: () => setError(''),
    refreshData,
    createMember: (payload) => runMutation(
      () => accountsApi.createMember(session, payload),
      'Miembro creado correctamente'
    ),
    createTrainer: (payload) => runMutation(
      () => accountsApi.createTrainer(session, payload),
      'Trainer creado correctamente'
    ),
    createReservation: (payload) => runMutation(
      () => reservationsApi.create(session, payload),
      'Reserva registrada correctamente'
    ),
    deleteMember: (memberId) => runMutation(
      () => accountsApi.deleteMember(session, memberId),
      'Miembro eliminado correctamente'
    ),
    deleteTrainer: (trainerId) => runMutation(
      () => accountsApi.deleteTrainer(session, trainerId),
      'Trainer eliminado correctamente'
    ),
    deleteReservation: (reservationId) => runMutation(
      () => reservationsApi.delete(session, reservationId),
      'Reserva eliminada correctamente'
    ),
  };
};