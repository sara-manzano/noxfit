const LAUNCH_PARAMS = ['checkin', 'billing'];

export const readLaunchParams = () => {
  const params = new URLSearchParams(window.location.search);

  return { checkin: params.get('checkin') || '', billing: params.get('billing') || '' };
};

export const clearLaunchParams = () => {
  const params = new URLSearchParams(window.location.search);

  if (!LAUNCH_PARAMS.some((name) => params.has(name))) {
    return;
  }

  LAUNCH_PARAMS.forEach((name) => params.delete(name));
  const search = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
};

export const getInitialView = (session, launch) => {
  if (session.role === 'trainer' && launch.checkin) {
    return 'checkin';
  }

  return session.role === 'member' && launch.billing ? 'billing' : 'panel';
};
