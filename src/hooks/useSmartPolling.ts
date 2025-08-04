import { useEffect, useRef, useCallback } from 'react';

interface SmartPollingOptions {
  enabled?: boolean;
  interval?: number;
  maxRetries?: number;
  backoffMultiplier?: number;
  stopCondition?: () => boolean;
}

/**
 * Smart polling hook that:
 * - Reduces frequency over time
 * - Stops when conditions are met
 * - Handles errors gracefully
 * - Prevents unnecessary API calls
 */
export const useSmartPolling = (
  callback: () => Promise<void> | void,
  options: SmartPollingOptions = {}
) => {
  const {
    enabled = true,
    interval = 60000, // 1 minute default
    maxRetries = 5,
    backoffMultiplier = 1.5,
    stopCondition
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const currentIntervalRef = useRef(interval);

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    clearPolling();

    if (!enabled) return;

    // Check stop condition
    if (stopCondition && stopCondition()) {
      console.log('🛑 Smart polling stopped - condition met');
      return;
    }

    const poll = async () => {
      try {
        await callback();
        
        // Reset retry count on success
        retryCountRef.current = 0;
        currentIntervalRef.current = interval;

        // Check stop condition after successful call
        if (stopCondition && stopCondition()) {
          console.log('🛑 Smart polling stopped - condition met after callback');
          clearPolling();
          return;
        }

      } catch (error) {
        console.error('Smart polling error:', error);
        
        // Increase retry count and interval
        retryCountRef.current += 1;
        
        if (retryCountRef.current >= maxRetries) {
          console.log('🛑 Smart polling stopped - max retries reached');
          clearPolling();
          return;
        }

        // Exponential backoff
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * backoffMultiplier,
          300000 // Max 5 minutes
        );
      }

      // Schedule next poll if still enabled
      if (enabled && !stopCondition?.()) {
        intervalRef.current = setTimeout(poll, currentIntervalRef.current);
      }
    };

    // Start first poll
    intervalRef.current = setTimeout(poll, currentIntervalRef.current);
  }, [callback, enabled, interval, maxRetries, backoffMultiplier, stopCondition, clearPolling]);

  useEffect(() => {
    startPolling();
    return clearPolling;
  }, [startPolling, clearPolling]);

  return {
    restart: startPolling,
    stop: clearPolling,
    isPolling: intervalRef.current !== null
  };
};

/**
 * Hook specifically for multi-signature status polling
 */
export const useMultiSignaturePolling = (
  callback: () => Promise<void> | void,
  status?: string,
  options: Omit<SmartPollingOptions, 'stopCondition'> = {}
) => {
  return useSmartPolling(callback, {
    ...options,
    interval: options.interval || 60000, // 1 minute default
    stopCondition: () => status === 'completed' || status === 'cancelled'
  });
};

/**
 * Hook for notification polling with smart frequency
 */
export const useNotificationPolling = (
  callback: () => Promise<void> | void,
  options: SmartPollingOptions = {}
) => {
  return useSmartPolling(callback, {
    interval: 120000, // 2 minutes default
    maxRetries: 3,
    ...options
  });
};
