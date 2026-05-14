import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOneCard } from '@/hooks/useOneCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, RefreshCw, Unlink, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Blobs, cls } from '@/lib/theme';

const formatCurrency = (n) =>
  typeof n === 'number' ? `$${n.toFixed(2)}` : '—';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const OneCardSettings = () => {
  const navigate = useNavigate();
  const { status, balances, transactions, loading, refreshing, connect, disconnect, refresh } = useOneCard();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [riskAck, setRiskAck] = useState(false);

  const onConnect = async (e) => {
    e.preventDefault();
    if (!riskAck) return;
    const res = await connect({ username, password, risk_acknowledged: true });
    if (res.ok) {
      setUsername('');
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div className={`${cls.pageBg} flex items-center justify-center`}>
        <Blobs />
        <div className="relative z-10 font-display text-3xl text-emerald-700">loading OneCard…</div>
      </div>
    );
  }

  const connected = status?.connected;

  return (
    <div className={cls.pageBg}>
      <Blobs />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 mb-6 text-sm text-gray-600 hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" /> back to dashboard
        </button>

        <div className="mb-6">
          <h1 className="font-display text-5xl text-emerald-700">your OneCard 💳</h1>
          <p className="text-gray-600 mt-1">Live balance + transactions from CCA TouchNet.</p>
        </div>

        <Card className="mb-4 border-amber-300 bg-amber-50">
          <CardHeader className="flex flex-row items-start gap-2 space-y-0">
            <ShieldAlert className="w-5 h-5 text-amber-700 mt-1 shrink-0" />
            <div>
              <CardTitle className="text-amber-900 text-lg">Before you connect</CardTitle>
              <CardDescription className="text-amber-900/80">
                MakersTab logs in to CCA OneWeb as you and reads your OneCard balance + transactions.
                Your CCA password is encrypted before storage. You may still receive Okta Verify push
                notifications when MakersTab re-authenticates (roughly every 4 hours during active use).
                You can disconnect at any time.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {!connected && (
          <Card>
            <CardHeader>
              <CardTitle>Connect OneCard</CardTitle>
              <CardDescription>Sign in with your CCA SSO credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onConnect} className="space-y-4">
                <div>
                  <Label htmlFor="cca-user">CCA email or username</Label>
                  <Input
                    id="cca-user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cca-pass">CCA password</Label>
                  <Input
                    id="cca-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="risk-ack"
                    checked={riskAck}
                    onCheckedChange={(v) => setRiskAck(Boolean(v))}
                  />
                  <Label htmlFor="risk-ack" className="text-sm leading-snug font-normal">
                    I understand my CCA password will be stored encrypted on MakersTab's server,
                    and that automated access to TouchNet OneWeb may not be permitted by CCA's
                    or TouchNet's terms of service.
                  </Label>
                </div>
                <Button
                  type="submit"
                  disabled={!riskAck || refreshing || !username || !password}
                  className="bg-green-700 hover:bg-green-800"
                >
                  {refreshing ? 'Connecting (approve the push on your phone)…' : 'Connect'}
                </Button>
                <p className="text-xs text-gray-500">
                  After you submit, watch your phone — Okta Verify will send a push notification you need to approve within 90 seconds.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {connected && (
          <>
            <Card className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>
                    OneCard
                    <Badge className="ml-2 bg-green-600">Connected</Badge>
                  </CardTitle>
                  <CardDescription>
                    {status?.display_name && <>Signed in as {status.display_name}. </>}
                    {status?.account_id && <>ID# {status.account_id}. </>}
                    Last sync: {formatDateTime(status?.last_sync_at)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={refresh} disabled={refreshing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={disconnect}>
                    <Unlink className="w-4 h-4 mr-2" /> Disconnect
                  </Button>
                </div>
              </CardHeader>
              {status?.last_error && (
                <CardContent>
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>Last sync had an error</AlertTitle>
                    <AlertDescription className="text-sm">{status.last_error}</AlertDescription>
                  </Alert>
                </CardContent>
              )}
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Balances</CardTitle>
              </CardHeader>
              <CardContent>
                {balances.length === 0 ? (
                  <p className="text-sm text-gray-500">No balances yet. Try Refresh.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {balances.map((b) => (
                      <div key={b.pot_name} className="rounded-lg border bg-white p-4">
                        <div className="text-sm text-gray-500">{b.pot_name}</div>
                        <div className="text-2xl font-semibold text-green-700">{formatCurrency(b.amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent transactions</CardTitle>
                <CardDescription>Most recent first. Up to 50 shown.</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-sm text-gray-500">No transactions yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date / Time</TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={`${tx.code}-${tx.occurred_at}-${tx.amount}`}>
                          <TableCell className="whitespace-nowrap">{formatDateTime(tx.occurred_at)}</TableCell>
                          <TableCell>{tx.code}</TableCell>
                          <TableCell className={`text-right ${tx.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(tx.running_balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default OneCardSettings;
