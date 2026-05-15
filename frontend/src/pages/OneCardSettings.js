import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOneCard } from '@/hooks/useOneCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ClipboardPaste, Trash2, ExternalLink } from 'lucide-react';
import { Blobs, cls, ORDER_URL } from '@/lib/theme';

const ONEWEB_STATEMENT_URL = 'https://secure.touchnet.net/C20080_oneweb/Account/Statement';

const formatCurrency = (n) => (typeof n === 'number' ? `$${n.toFixed(2)}` : '—');
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
  const { balances, transactions, loading, importing, importStatement, clearAll } = useOneCard();
  const [pasteText, setPasteText] = useState('');

  const onImport = async (e) => {
    e.preventDefault();
    if (!pasteText.trim()) return;
    const res = await importStatement(pasteText);
    if (res.ok) setPasteText('');
  };

  if (loading) {
    return (
      <div className={`${cls.pageBg} flex items-center justify-center`}>
        <Blobs />
        <div className="relative z-10 font-display text-3xl text-emerald-700">loading OneCard…</div>
      </div>
    );
  }

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
          <p className="text-gray-600 mt-1">
            Paste your OneWeb statement to backfill transactions. Receipt scanning already
            keeps your balance current — this is just for history you didn’t snap.
          </p>
        </div>

        {/* Import */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-emerald-600" />
              Paste a statement
            </CardTitle>
            <CardDescription>
              Open your{' '}
              <a
                href={ONEWEB_STATEMENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline inline-flex items-center gap-1"
              >
                OneWeb Current Statement <ExternalLink className="w-3 h-3" />
              </a>
              , select the whole table (Transaction / Date-Time / Amount / Balance), copy it,
              and paste below. We never see your CCA login — you stay in control.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onImport} className="space-y-3">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={
                  'Name  Student Balance\nEnd Amount  $0.89\n' +
                  '004 : VEND (MONEY)  2026-05-11 18:39:39  -$14.49  1\n…'
                }
                rows={8}
                className="w-full rounded-2xl border-2 border-emerald-100 bg-white p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={importing || !pasteText.trim()}
                  className={cls.btnPrimary}
                >
                  {importing ? 'Importing…' : 'Import statement'}
                </Button>
                {(balances.length > 0 || transactions.length > 0) && (
                  <Button type="button" variant="outline" onClick={clearAll} className="rounded-full">
                    <Trash2 className="w-4 h-4 mr-2" /> Clear all
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Balances */}
        {balances.length > 0 && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {balances.map((b) => (
                  <div key={b.pot_name} className="rounded-2xl border bg-white p-4">
                    <div className="text-sm text-gray-500">{b.pot_name}</div>
                    <div className="font-display text-4xl text-emerald-700">
                      {formatCurrency(b.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Imported transactions</CardTitle>
            <CardDescription>Most recent first. Up to 50 shown. Duplicates are skipped automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing imported yet — paste a statement above.</p>
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
                      <TableCell className={`text-right ${tx.amount < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
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

        <div className="mt-6 text-center">
          <a
            href={ORDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${cls.btnSecondary} inline-flex`}
          >
            <ExternalLink className="w-4 h-4" />
            Order online at CCA dining
          </a>
        </div>
      </div>
    </div>
  );
};

export default OneCardSettings;
