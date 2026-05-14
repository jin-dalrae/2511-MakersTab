import axios from 'axios';
import { API } from '@/App';
import { getAuthHeaders } from '@/lib/firebase';

async function authConfig(extra = {}) {
  const headers = await getAuthHeaders();
  return { ...extra, headers: { ...(extra.headers || {}), ...headers } };
}

export const onecardApi = {
  status: async () =>
    axios.get(`${API}/onecard/status`, await authConfig()),

  connect: async ({ username, password, risk_acknowledged }) =>
    axios.post(
      `${API}/onecard/connect`,
      { username, password, risk_acknowledged },
      await authConfig({ timeout: 120000 }),
    ),

  disconnect: async () =>
    axios.delete(`${API}/onecard/disconnect`, await authConfig()),

  refresh: async () =>
    axios.post(`${API}/onecard/refresh`, {}, await authConfig({ timeout: 120000 })),

  balance: async () =>
    axios.get(`${API}/onecard/balance`, await authConfig()),

  transactions: async (limit = 50) =>
    axios.get(`${API}/onecard/transactions`, await authConfig({ params: { limit } })),
};
