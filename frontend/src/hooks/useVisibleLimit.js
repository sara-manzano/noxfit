import { useCallback, useEffect, useState } from 'react';

export const useVisibleLimit = (pageSize, resetKey) => {
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    setLimit(pageSize);
  }, [pageSize, resetKey]);

  const showMore = useCallback(() => setLimit((current) => current + pageSize), [pageSize]);

  return [limit, showMore];
};
