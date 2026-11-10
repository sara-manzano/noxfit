import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { accountsApi, highlightsApi, reservationsApi, waitlistApi } from '../api/client.js';
import {
  adjustCredits,
  findById,
  hasWaitingFor,
  mergeById,
  removeById,
  removeWaitlistEntry,
  sortByName,
  syncReservationOwner,
  upsert,
  upsertSorted,
} from '../lib/workspacePatches.js';
import { useDismissibleMessage } from './useDismissibleMessage.js';

const emptyWorkspace = {
  profile: null,
  members: [],
  trainers: [],
  reservations: [],
  waitlist: [],
  memberDirectory: [],
  trainerDirectory: [],
  highlights: null,
};

const sliceLoaders = {
  reservations: async (session) => ({ reservations: (await reservationsApi.list(session)).items }),
  waitlist: async (session) => ({ waitlist: (await waitlistApi.list(session)).items }),
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'workspace/patch':
      return { ...state, workspace: action.update(state.workspace) };
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
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;

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

    const failedSections = [];
    const optional = (label, request, fallback) => request.catch((requestError) => {
      if (requestError.status === 401) {
        throw requestError;
      }

      console.error(`Failed to load ${label}`, requestError);
      failedSections.push(label);
      return fallback;
    });
    const reportFailedSections = () => {
      if (failedSections.length) {
        dispatch({
          type: 'error',
          message: `No se pudo cargar ${failedSections.join(' ni ')}. Lo que ves puede estar incompleto; recarga la página para reintentarlo`,
        });
      }
    };

    try {
      if (session.role === 'trainer' && session.user.is_admin) {
        const [profile, members, trainers, reservations, highlights, waitlist] = await Promise.all([
          accountsApi.getProfile(session),
          accountsApi.listMembers(session),
          accountsApi.listTrainers(session),
          reservationsApi.list(session),
          optional('las novedades', highlightsApi.get(session), null),
          optional('la lista de espera', waitlistApi.list(session), { items: [] }),
        ]);

        dispatch({
          type: 'refresh/success',
          workspace: {
            ...emptyWorkspace,
            profile,
            highlights,
            members: members.items,
            trainers: trainers.items,
            reservations: reservations.items,
            waitlist: waitlist.items,
            memberDirectory: members.items,
            trainerDirectory: trainers.items,
          },
        });
        reportFailedSections();
        return;
      }

      const directoryRequest = optional(
        'el directorio',
        session.role === 'trainer'
          ? accountsApi.listMemberDirectory(session)
          : accountsApi.listTrainerDirectory(session),
        { items: [] }
      );
      const [profile, reservations, directory, highlights, waitlist] = await Promise.all([
        accountsApi.getProfile(session),
        reservationsApi.list(session),
        directoryRequest,
        optional('las novedades', highlightsApi.get(session), null),
        optional('la lista de espera', waitlistApi.list(session), { items: [] }),
      ]);

      dispatch({
        type: 'refresh/success',
        workspace: {
          ...emptyWorkspace,
          profile,
          highlights,
          reservations: reservations.items,
          waitlist: waitlist.items,
          memberDirectory: session.role === 'trainer' ? directory.items : [],
          trainerDirectory: session.role === 'member' ? directory.items : [],
        },
      });
      reportFailedSections();
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      dispatch({ type: 'refresh/end' });
    }
  }, [session, handleRequestError]);

  useEffect(() => {
    refreshData();
  }, [session?.role, session?.token, session?.user?.is_admin]);

  const runMutation = useCallback(async (operation, successMessage, { patch, refresh } = {}) => {
    dispatch({ type: 'mutation/start' });

    try {
      const before = workspaceRef.current;
      const result = await operation();
      const slices = refresh?.(before, result) ?? [];

      if (patch) {
        dispatch({ type: 'workspace/patch', update: (current) => patch(current, result) });
      }

      if (slices.length) {
        try {
          const loaded = await Promise.all(slices.map((slice) => sliceLoaders[slice](session)));
          dispatch({ type: 'workspace/patch', update: (current) => Object.assign({}, current, ...loaded) });
        } catch (refreshError) {
          handleRequestError(refreshError);
        }
      }

      if (successMessage) {
        dispatch({ type: 'notice', message: successMessage });
      }
      return true;
    } catch (requestError) {
      handleRequestError(requestError);
      return false;
    } finally {
      dispatch({ type: 'mutation/end' });
    }
  }, [session, handleRequestError]);

  const actions = useMemo(() => {
    const isMember = session?.role === 'member';
    const withCredits = (current, delta) => (isMember ? { ...current, profile: adjustCredits(current.profile, delta) } : current);
    const promotionRefresh = (before, ...reservations) => (
      session?.role === 'trainer' && hasWaitingFor(before, ...reservations) ? ['reservations', 'waitlist'] : []
    );
    const applyProfile = (current, updated, payload) => {
      const profile = {
        ...current.profile,
        ...updated,
        ...(payload.avatar !== undefined ? { avatar: payload.avatar } : {}),
      };

      return session.role === 'trainer'
        ? {
          ...current,
          profile,
          trainers: mergeById(current.trainers, updated, 'trainer_id'),
          trainerDirectory: mergeById(current.trainerDirectory, updated, 'trainer_id'),
          reservations: syncReservationOwner(current.reservations, 'trainer', 'trainer_id', updated),
        }
        : {
          ...current,
          profile,
          reservations: syncReservationOwner(current.reservations, 'member', 'member_id', updated),
        };
    };
    const updateProfile = (payload, message) => runMutation(
      () => accountsApi.updateProfile(session, payload),
      message,
      { patch: (current, updated) => applyProfile(current, updated, payload) }
    );
    const moveReservation = (reservationId, request, message) => runMutation(request, message, {
      patch: (current, moved) => ({
        ...current,
        reservations: upsertSorted(current.reservations, moved, 'reservation_id'),
      }),
      refresh: (before) => promotionRefresh(before, findById(before.reservations, 'reservation_id', reservationId)),
    });

    return {
      getTrainerAvailability: (date, timeSlot) => reservationsApi.availability(session, date, timeSlot),
      createMember: (payload) => runMutation(
        () => accountsApi.createMember(session, payload),
        'Socio creado correctamente',
        {
          patch: (current, member) => {
            const members = sortByName(upsert(current.members, member, 'member_id'));

            return { ...current, members, memberDirectory: members };
          },
        }
      ),
      updateProfile: (payload) => updateProfile(payload, 'Perfil actualizado correctamente'),
      updateAvatar: (avatar) => updateProfile(
        { avatar },
        avatar ? 'Foto de perfil actualizada' : 'Foto de perfil restablecida'
      ),
      createReservation: (payload) => runMutation(
        () => reservationsApi.create(session, payload),
        'Reserva registrada correctamente',
        {
          patch: (current, created) => withCredits({
            ...current,
            reservations: upsertSorted(current.reservations, created, 'reservation_id'),
          }, created.credit_used ? -1 : 0),
        }
      ),
      deleteMember: (memberId) => runMutation(
        () => accountsApi.deleteMember(session, memberId),
        'Socio eliminado correctamente',
        {
          patch: (current) => ({
            ...current,
            members: removeById(current.members, 'member_id', memberId),
            memberDirectory: removeById(current.memberDirectory, 'member_id', memberId),
            waitlist: current.waitlist.filter((entry) => entry.member?.member_id !== memberId),
          }),
        }
      ),
      deleteReservation: (reservationId) => runMutation(
        () => reservationsApi.delete(session, reservationId),
        'Reserva eliminada correctamente',
        {
          patch: (current) => {
            const deleted = findById(current.reservations, 'reservation_id', reservationId);
            const refunded = deleted?.status === 'Confirmada' && deleted.credit_used;

            return withCredits({
              ...current,
              reservations: removeById(current.reservations, 'reservation_id', reservationId),
            }, refunded ? 1 : 0);
          },
          refresh: (before) => {
            const deleted = findById(before.reservations, 'reservation_id', reservationId);

            return deleted?.status === 'Confirmada' ? promotionRefresh(before, deleted) : [];
          },
        }
      ),
      updateHighlights: (payload) => runMutation(
        () => highlightsApi.update(session, payload),
        'Contenido actualizado correctamente',
        { patch: (current, highlights) => ({ ...current, highlights }) }
      ),
      moveReservation: (reservationId, payload) => moveReservation(
        reservationId,
        () => reservationsApi.update(session, reservationId, payload),
        ''
      ),
      cancelReservation: (reservationId) => runMutation(
        () => reservationsApi.cancel(session, reservationId),
        'Reserva cancelada correctamente',
        {
          patch: (current, cancelled) => {
            const previous = findById(current.reservations, 'reservation_id', reservationId);

            return withCredits({
              ...current,
              reservations: upsert(current.reservations, { ...cancelled, credit_used: false }, 'reservation_id'),
            }, previous?.credit_used ? 1 : 0);
          },
          refresh: (before) => promotionRefresh(before, findById(before.reservations, 'reservation_id', reservationId)),
        }
      ),
      rescheduleReservation: (reservationId, payload) => moveReservation(
        reservationId,
        () => reservationsApi.reschedule(session, reservationId, payload),
        'Reserva reprogramada correctamente'
      ),
      joinWaitlist: (payload) => runMutation(
        () => waitlistApi.join(session, payload),
        'Te has apuntado a la lista de espera. Te avisaremos por email si se libera una plaza',
        {
          patch: (current, entry) => ({
            ...current,
            waitlist: upsertSorted(current.waitlist, entry, 'waitlist_id'),
          }),
        }
      ),
      leaveWaitlist: (waitlistId) => runMutation(
        () => waitlistApi.leave(session, waitlistId),
        'Has salido de la lista de espera',
        { patch: (current) => ({ ...current, waitlist: removeWaitlistEntry(current.waitlist, waitlistId) }) }
      ),
      checkIn: (code) => runMutation(
        () => reservationsApi.checkin(session, code),
        'Check-in registrado correctamente',
        {
          patch: (current, checkedIn) => ({
            ...current,
            reservations: upsertSorted(current.reservations, checkedIn, 'reservation_id'),
          }),
        }
      ),
      getCheckinCode: (reservationId) => reservationsApi.checkinCode(session, reservationId),
    };
  }, [session, runMutation]);

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