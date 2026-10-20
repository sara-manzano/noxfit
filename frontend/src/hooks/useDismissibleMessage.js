import { useEffect, useEffectEvent } from 'react';

export const useDismissibleMessage = (message, clearMessage, delay = 4200) => {
  const clearMessageEvent = useEffectEvent(clearMessage);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      clearMessageEvent();
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message, delay]);
};