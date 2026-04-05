import { useState, useEffect, useCallback } from 'react';
import {
  getImageQuota,
  canSendImage,
  incrementImageCount,
  IMAGE_DAILY_LIMIT,
} from '@/services/license/imageQuota';

export function useImageQuota() {
  const [used, setUsed] = useState(0);
  const [limit] = useState(IMAGE_DAILY_LIMIT);

  const refresh = useCallback(async () => {
    const quota = await getImageQuota();
    setUsed(quota.used);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remaining = Math.max(0, limit - used);
  const canSend = used < limit;

  const increment = useCallback(async () => {
    await incrementImageCount();
    setUsed((prev) => prev + 1);
  }, []);

  const checkCanSend = useCallback(async () => {
    return canSendImage();
  }, []);

  return { used, limit, remaining, canSend, increment, checkCanSend, refresh };
}
