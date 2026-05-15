import axios from 'axios';
import { API } from '@/App';
import { getAuthHeaders } from '@/lib/firebase';

async function authConfig(extra = {}) {
  const headers = await getAuthHeaders();
  return { ...extra, headers: { ...(extra.headers || {}), ...headers } };
}

export const onecardApi = {
  importStatement: async (raw_text, pot_name) =>
    axios.post(`${API}/onecard/import`, { raw_text, pot_name }, await authConfig()),

  balance: async () =>
    axios.get(`${API}/onecard/balance`, await authConfig()),

  transactions: async (limit = 50) =>
    axios.get(`${API}/onecard/transactions`, await authConfig({ params: { limit } })),

  clear: async () =>
    axios.delete(`${API}/onecard/clear`, await authConfig()),
};
