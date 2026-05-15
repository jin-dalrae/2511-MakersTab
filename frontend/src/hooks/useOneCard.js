import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { onecardApi } from '@/services/onecardApi';

export function useOneCard() {
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, txRes] = await Promise.all([
        onecardApi.balance(),
        onecardApi.transactions(50),
      ]);
      setBalances(balRes.data);
      setTransactions(txRes.data);
    } catch (e) {
      console.error('OneCard load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const importStatement = useCallback(async (rawText) => {
    setImporting(true);
    try {
      const res = await onecardApi.importStatement(rawText);
      await loadAll();
      const d = res.data;
      toast.success(
        `Imported — ${d.transactions_added} new, ${d.skipped_duplicates} already had` +
          (d.balance != null ? `, balance $${d.balance.toFixed(2)}` : ''),
      );
      return { ok: true, result: d };
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      toast.error(detail);
      return { ok: false, error: detail };
    } finally {
      setImporting(false);
    }
  }, [loadAll]);

  const clearAll = useCallback(async () => {
    try {
      await onecardApi.clear();
      setBalances([]);
      setTransactions([]);
      toast.success('OneCard data cleared');
    } catch (e) {
      toast.error('Clear failed');
    }
  }, []);

  return {
    balances,
    transactions,
    loading,
    importing,
    importStatement,
    clearAll,
    reload: loadAll,
  };
}
