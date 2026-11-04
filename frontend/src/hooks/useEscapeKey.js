import { useEffect, useEffectEvent } from 'react';

export const useEscapeKey = (onEscape, active = true) => {
  const onEscapeEvent = useEffectEvent(onEscape);

  useEffect(() => {
    if (!active) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onEscapeEvent();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);
};
