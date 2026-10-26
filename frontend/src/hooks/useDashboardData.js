import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { accountsApi, reservationsApi } from '../api/client.js';
import { useDismissibleMessage } from './useDismissibleMessage.js';

const emptyWorkspace = {
  profile: null,
  members: [],
  trainers: [],
  reservations: [],
  memberDirectory: [],
  trainerDirectory: [],
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'refresh/start':
      return { ...state, isLoading: action.silent ? state.isLoading : true, error: '' };
    case 'refresh/success':
      return { ...state, workspace: action.workspace };
    case 'refresh/reset':
      return { ...state, workspace: emptyWorkspace, isLoading: false };
    case 'refresh/end':
      return { ...state, isLoading: false };
    case 'mutation/start':
      return { ...state, isSubmitting: true, error: '' };
    case 'mutation/end':
      return { ...state, isSubmitting: false };
    case 'error':
      return { ...state, error: action.message };
    case 'notice':
      return { ...state, notice: action.message };
    default:
      return state;
  }
};

export const useDashboardData = (session, onSessionExpired) => {
  const [state, dispatch] = useReducer(reducer, {
    workspace: emptyWorkspace,
    isLoading: Boolean(session),
    isSubmitting: false,
    error: '',
    notice: '',
  });
  const { workspace, isLoading, isSubmitting, error, notice } = state;

  const clearNotice = useCallback(() => dispatch({ type: 'notice', message: '' }), []);
  useDismissibleMessage(notice, clearNotice);

  const handleRequestError = useCallback((requestError) => {
    if (requestError.status === 401 && onSessionExpired) {
      onSessionExpired();
      return;
    }

    dispatch({ type: 'error', message: requestError.message });
  }, [onSessionExpired]);

  const refreshData = useCallback(async ({ silent = false } = {}) => {
    if (!session?.token) {
      dispatch({ type: 'refresh/reset' });
      return;
    }

    dispatch({ type: 'refresh/start', silent });

    try {
      if (session.role === 'trainer' && session.user.is_admin) {
        const [profile, members, trainers, reservations] = await Promise.all([
          accountsApi.getProfile(session),
          accountsApi.listMembers(session),
          accountsApi.listTrainers(session),
          reservationsApi.list(session),
        ]);

        dispatch({
          type: 'refresh/success',
          workspace: {
            ...emptyWorkspace,
            profile,
            members: members.items,
            trainers: trainers.items,
            reservations: reservations.items,
            memberDirectory: members.items,
            trainerDirectory: trainers.items,
          },
        });
        return;
      }

      const directoryRequest = (session.role === 'trainer'
        ? accountsApi.listMemberDirectory(session)
        : accountsApi.listTrainerDirectory(session)
      ).catch(() => ({ items: [] }));
      const [profile, reservations, directory] = await Promise.all([
        accountsApi.getProfile(session),
        reservationsApi.list(session),
        directoryRequest,
      ]);

      dispatch({
        type: 'refresh/success',
        workspace: {
          ...emptyWorkspace,
          profile,
          reservations: reservations.items,
          memberDirectory: session.role === 'trainer' ? directory.items : [],
          trainerDirectory: session.role === 'member' ? directory.items : [],
        },
      });
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      dispatch({ type: 'refresh/end' });
    }
  }, [session, handleRequestError]);

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when identity changes, not on every session object update
  }, [session?.role, session?.token, session?.user?.is_admin]);

  const runMutation = useCallback(async (operation, successMessage, { silent = false } = {}) => {
    dispatch({ type: 'mutation/start' });

    try {
      await operation();
      await refreshData({ silent });
      if (successMessage) {
        dispatch({ type: 'notice', message: successMessage });
      }
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      dispatch({ type: 'mutation/end' });
    }
  }, [refreshData, handleRequestError]);

  const actions = useMemo(() => ({
    getTrainerAvailability: (date, timeSlot) => reservationsApi.availability(session, date, timeSlot),
    createMember: (payload) => runMutation(
      () => accountsApi.createMember(session, payload),
      'Socio creado correctamente'
    ),
    updateAvatar: (avatar) => runMutation(
      () => accountsApi.updateAvatar(session, avatar),
      avatar ? 'Foto de perfil actualizada' : 'Foto de perfil restablecida'
    ),
    createReservation: (payload) => runMutation(
      () => reservationsApi.create(session, payload),
      'Reserva registrada correctamente'
    ),
    deleteMember: (memberId) => runMutation(
      () => accountsApi.deleteMember(session, memberId),
      'Socio eliminado correctamente'
    ),
    deleteReservation: (reservationId) => runMutation(
      () => reservationsApi.delete(session, reservationId),
      'Reserva eliminada correctamente'
    ),
    moveReservation: (reservationId, payload) => runMutation(
      () => reservationsApi.update(session, reservationId, payload),
      '',
      { silent: true }
    ),
  }), [session, runMutation]);

  return {
    ...workspace,
    isLoading,
    isSubmitting,
    error,
    notice,
    refreshData,
    ...actions,
  };
};