import { useState } from 'react';

// onError devuelve true cuando gestiona el fallo y no debe mostrarse como mensaje.
export const useAsyncAction = ({ onError } = {}) => {
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const run = async (task) => {
    setError('');
    setIsPending(true);

    try {
      await task();
    } catch (taskError) {
      if (!onError?.(taskError)) {
        setError(taskError.message);
      }
    } finally {
      setIsPending(false);
    }
  };

  return { error, setError, isPending, run };
};
