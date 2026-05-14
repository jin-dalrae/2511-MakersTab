import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { onecardApi } from '@/services/onecardApi';

export function useOneCard() {
  const [status, setStatus] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const statusRes = await onecardApi.status();
      setStatus(statusRes.data);
      if (statusRes.data.connected) {
        const [balRes, txRes] = await Promise.all([
          onecardApi.balance(),
          onecardApi.transactions(50),
        ]);
        setBalances(balRes.data);
        setTransactions(txRes.data);
      } else {
        setBalances([]);
        setTransactions([]);
      }
    } catch (e) {
      console.error('OneCard load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const connect = useCallback(async ({ username, password, risk_acknowledged }) => {
    setRefreshing(true);
    try {
      const res = await onecardApi.connect({ username, password, risk_acknowledged });
      setStatus(res.data);
      await loadAll();
      toast.success('OneCard connected');
      return { ok: true };
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      toast.error(`Connection failed: ${detail}`);
      return { ok: false, error: detail };
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const disconnect = useCallback(async () => {
    try {
      await onecardApi.disconnect();
      setStatus({ connected: false });
      setBalances([]);
      setTransactions([]);
      toast.success('OneCard disconnected');
    } catch (e) {
      toast.error('Disconnect failed');
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onecardApi.refresh();
      await loadAll();
      toast.success('OneCard refreshed');
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      toast.error(`Refresh failed: ${detail}`);
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  return {
    status,
    balances,
    transactions,
    loading,
    refreshing,
    connect,
    disconnect,
    refresh,
    reload: loadAll,
  };
}
