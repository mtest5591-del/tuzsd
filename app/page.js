'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Shield, Settings as SettingsIcon, LogOut, ArrowDownCircle, ArrowUpCircle, ShieldCheck, KeyRound, Network, Coins } from 'lucide-react';

const API = '/api';

async function api(path, { method = 'GET', body, userId } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId) headers['x-user-id'] = userId;
  const res = await fetch(`${API}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { data, status: res.status });
  return data;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('user');
  const [password, setPassword] = useState('user123');
  const [otp, setOtp] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const data = await api('auth/login', { method: 'POST', body: { username, password, otp: otp || undefined } });
      if (data.requires2FA) {
        setNeeds2FA(true);
        toast.info('Введіть код Google Authenticator');
        return;
      }
      onLogin(data.user);
    } catch (e) {
      if (e.data?.requires2FA) { setNeeds2FA(true); toast.error(e.message); }
      else toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
      <Card className="w-full max-w-md border-emerald-900/50 bg-slate-900/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-2">
            <Coins className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">MaksPay</CardTitle>
          <CardDescription className="text-slate-400">Криптоплатіжна платформа</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-200">Логін</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div>
            <Label className="text-slate-200">Пароль</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          {needs2FA && (
            <div>
              <Label className="text-slate-200 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Код 2FA</Label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-значний код" className="bg-slate-800 border-slate-700 text-white tracking-widest text-center" />
            </div>
          )}
          <Button onClick={submit} disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90">
            {loading ? 'Вхід...' : 'Увійти'}
          </Button>
          <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
            <div className="font-semibold text-slate-300">Тестові акаунти:</div>
            <div>👤 <b>user</b> / user123 — звичайний користувач</div>
            <div>🛡️ <b>admin</b> / admin123 — суперадміністратор</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WalletTab({ user, settings, refreshUser, refreshSettings }) {
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('TRC20');
  const [wAmount, setWAmount] = useState('');
  const [wNetwork, setWNetwork] = useState('TRC20');
  const [wAddress, setWAddress] = useState('');
  const [wOtp, setWOtp] = useState('');
  const [via, setVia] = useState('cabinet');
  const [txs, setTxs] = useState([]);

  const activeNetworks = Object.entries(settings?.networks || {}).filter(([, v]) => v).map(([k]) => k);

  const loadTx = async () => {
    try {
      const d = await api('wallet/transactions', { userId: user.id });
      setTxs(d.transactions || []);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { loadTx(); }, [user.id]);

  const deposit = async () => {
    try {
      const amt = Number(amount);
      if (!amt) return toast.error('Введіть суму');
      const d = await api('wallet/deposit', { method: 'POST', userId: user.id, body: { amount: amt, network } });
      toast.success(`Поповнено: +${d.transaction.netAmount} USDT (комісія ${d.transaction.fee})`);
      setAmount('');
      await refreshUser(); await loadTx();
    } catch (e) { toast.error(e.message); }
  };

  const withdraw = async () => {
    try {
      const amt = Number(wAmount);
      if (!amt) return toast.error('Введіть суму');
      if (!wAddress) return toast.error('Введіть адресу');
      const d = await api('wallet/withdraw', { method: 'POST', userId: user.id, body: { amount: amt, network: wNetwork, address: wAddress, via, otp: wOtp || undefined } });
      toast.success(`Виведено ${d.transaction.grossAmount} USDT (комісія ${d.transaction.fee})`);
      setWAmount(''); setWAddress(''); setWOtp('');
      await refreshUser(); await loadTx();
    } catch (e) { toast.error(e.message); }
  };

  const depositFee = settings?.depositFee ?? 0;
  const previewNet = amount ? Math.max(0, (Number(amount) - depositFee)).toFixed(4) : '0';
  const wFeeUsed = via === 'api' ? settings?.apiWithdrawalFee : settings?.withdrawalFee;
  const previewTotal = wAmount ? (Number(wAmount) + Number(wFeeUsed || 0)).toFixed(4) : '0';

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
          <CardHeader>
            <CardDescription className="text-emerald-100">Баланс</CardDescription>
            <CardTitle className="text-4xl">{(user.balance || 0).toFixed(4)} <span className="text-lg font-normal">USDT</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-emerald-100">Активні мережі: {activeNetworks.join(', ') || '—'}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowDownCircle className="w-5 h-5 text-emerald-600" /> Поповнення</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Сума (USDT)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10" />
              </div>
              <div>
                <Label>Мережа</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeNetworks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Сума до відправлення:</span><b>{amount || '0'} USDT</b></div>
              <div className="flex justify-between text-orange-600"><span>Комісія платформи:</span><b>-{depositFee} USDT</b></div>
              <Separator />
              <div className="flex justify-between text-emerald-600 font-semibold"><span>Буде зараховано:</span><b>{previewNet} USDT</b></div>
            </div>
            <Button onClick={deposit} className="w-full">Симулювати поповнення</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowUpCircle className="w-5 h-5 text-red-600" /> Виведення</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Сума</Label>
              <Input type="number" value={wAmount} onChange={(e) => setWAmount(e.target.value)} placeholder="5" />
            </div>
            <div>
              <Label>Мережа</Label>
              <Select value={wNetwork} onValueChange={setWNetwork}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeNetworks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Адреса гаманця</Label>
              <Input value={wAddress} onChange={(e) => setWAddress(e.target.value)} placeholder="T..." />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Спосіб</Label>
              <Select value={via} onValueChange={setVia}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cabinet">Особистий кабінет</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {user.twoFA?.enabled && (
              <div>
                <Label className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Код 2FA</Label>
                <Input value={wOtp} onChange={(e) => setWOtp(e.target.value)} placeholder="6 цифр" />
              </div>
            )}
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Сума виводу:</span><b>{wAmount || '0'} USDT</b></div>
            <div className="flex justify-between text-orange-600"><span>Комісія ({via === 'api' ? 'API' : 'кабінет'}):</span><b>+{wFeeUsed || 0} USDT</b></div>
            <Separator />
            <div className="flex justify-between font-semibold"><span>Буде списано з балансу:</span><b>{previewTotal} USDT</b></div>
          </div>
          <Button onClick={withdraw} variant="destructive" className="w-full">Вивести кошти</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Історія транзакцій</CardTitle></CardHeader>
        <CardContent>
          {txs.length === 0 ? <div className="text-sm text-muted-foreground">Транзакцій немає</div> : (
            <div className="space-y-2">
              {txs.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {t.type === 'deposit' ? <ArrowDownCircle className="w-8 h-8 text-emerald-600" /> : <ArrowUpCircle className="w-8 h-8 text-red-600" />}
                    <div>
                      <div className="font-medium">{t.type === 'deposit' ? 'Поповнення' : 'Виведення'} <Badge variant="outline" className="ml-2">{t.network}</Badge> {t.via === 'api' && <Badge className="ml-1" variant="secondary">API</Badge>}</div>
                      <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString('uk-UA')}</div>
                      <div className="text-xs text-muted-foreground">Комісія: <b className="text-orange-600">{t.fee} USDT</b>{t.type === 'deposit' ? ` • Отримано: ${t.netAmount}` : ` • Списано: ${t.totalDeducted}`}</div>
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${t.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'deposit' ? '+' : '-'}{t.type === 'deposit' ? t.netAmount : t.grossAmount} USDT
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminTab({ user, settings, refreshSettings }) {
  const [depositFee, setDepositFee] = useState(settings?.depositFee ?? 0.5);
  const [withdrawalFee, setWithdrawalFee] = useState(settings?.withdrawalFee ?? 1.0);
  const [apiWithdrawalFee, setApiWithdrawalFee] = useState(settings?.apiWithdrawalFee ?? 0.8);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    setDepositFee(settings?.depositFee ?? 0.5);
    setWithdrawalFee(settings?.withdrawalFee ?? 1.0);
    setApiWithdrawalFee(settings?.apiWithdrawalFee ?? 0.8);
  }, [settings]);

  const save = async () => {
    try {
      await api('admin/fees', { method: 'POST', userId: user.id, body: {
        depositFee: Number(depositFee),
        withdrawalFee: Number(withdrawalFee),
        apiWithdrawalFee: Number(apiWithdrawalFee),
        otp: otp || undefined,
      } });
      toast.success('Комісії оновлено');
      setOtp('');
      await refreshSettings();
    } catch (e) { toast.error(e.message); }
  };

  const toggleNet = async (network, enabled) => {
    try {
      await api('admin/networks', { method: 'POST', userId: user.id, body: { network, enabled } });
      toast.success(`Мережа ${network} ${enabled ? 'увімкнена' : 'вимкнена'}`);
      await refreshSettings();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Coins className="w-5 h-5 text-emerald-600" /> Налаштування комісій</CardTitle>
          <CardDescription>Тільки для суперадміністратора MaksPay. Регулює дохід платформи.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Комісія на вхід (USDT)</Label>
              <Input type="number" step="0.01" value={depositFee} onChange={(e) => setDepositFee(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Приклад: при 0.5 USDT — з 10 отримають 9.5</p>
            </div>
            <div>
              <Label>Комісія на вивід (кабінет)</Label>
              <Input type="number" step="0.01" value={withdrawalFee} onChange={(e) => setWithdrawalFee(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Прямий вивід з особистого кабінету</p>
            </div>
            <div>
              <Label>Комісія на вивід (API)</Label>
              <Input type="number" step="0.01" value={apiWithdrawalFee} onChange={(e) => setApiWithdrawalFee(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Для API-виводів мерчантів</p>
            </div>
          </div>
          {user.twoFA?.enabled && (
            <div className="max-w-xs">
              <Label className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Код 2FA</Label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6 цифр" />
            </div>
          )}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
            <div className="text-sm"><span className="text-muted-foreground">Пул проєкту (усі комісії):</span> <b className="text-lg text-emerald-600">{(settings?.projectPool || 0).toFixed(4)} USDT</b></div>
            <Button onClick={save}>Зберегти</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Network className="w-5 h-5" /> Керування мережами</CardTitle>
          <CardDescription>Вимкнення тумблера миттєво зупиняє прийом та вивід у мережі.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {['TRC20', 'ERC20', 'BEP20'].map(n => (
            <div key={n} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50">
              <div>
                <div className="font-semibold">{n}</div>
                <div className="text-xs text-muted-foreground">
                  {n === 'TRC20' && 'Tron network'} {n === 'ERC20' && 'Ethereum network'} {n === 'BEP20' && 'BNB Smart Chain'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={settings?.networks?.[n] ? 'default' : 'secondary'}>
                  {settings?.networks?.[n] ? 'Активна' : 'Вимкнена'}
                </Badge>
                <Switch checked={!!settings?.networks?.[n]} onCheckedChange={(v) => toggleNet(n, v)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityTab({ user, refreshUser }) {
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState('');
  const [disableOtp, setDisableOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const d = await api('2fa/setup', { method: 'POST', userId: user.id });
      setQr(d.qrDataUrl); setSecret(d.secret);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const enable = async () => {
    try {
      await api('2fa/enable', { method: 'POST', userId: user.id, body: { otp } });
      toast.success('2FA увімкнено!');
      setQr(null); setSecret(''); setOtp('');
      await refreshUser();
    } catch (e) { toast.error(e.message); }
  };

  const disable = async () => {
    try {
      await api('2fa/disable', { method: 'POST', userId: user.id, body: { otp: disableOtp } });
      toast.success('2FA вимкнено');
      setDisableOtp('');
      await refreshUser();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" /> Google Authenticator (2FA)</CardTitle>
          <CardDescription>Захистіть вхід та критичні дії (виведення, зміна налаштувань) кодом з застосунку.</CardDescription>
        </CardHeader>
        <CardContent>
          {user.twoFA?.enabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
                <div>
                  <div className="font-semibold text-emerald-900">2FA активна</div>
                  <div className="text-sm text-emerald-700">Ваш акаунт додатково захищений</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Введіть поточний код, щоб вимкнути</Label>
                <div className="flex gap-2">
                  <Input value={disableOtp} onChange={(e) => setDisableOtp(e.target.value)} placeholder="6 цифр" />
                  <Button variant="destructive" onClick={disable}>Вимкнути 2FA</Button>
                </div>
              </div>
            </div>
          ) : qr ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <img src={qr} alt="QR" className="w-48 h-48 border rounded" />
                <div className="space-y-2 flex-1">
                  <div className="text-sm text-muted-foreground">1. Відкрийте Google Authenticator</div>
                  <div className="text-sm text-muted-foreground">2. Відскануйте QR-код або введіть секрет вручну:</div>
                  <div className="font-mono text-xs bg-muted p-2 rounded break-all">{secret}</div>
                  <div className="text-sm text-muted-foreground">3. Введіть 6-значний код нижче:</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6 цифр" className="max-w-xs" />
                <Button onClick={enable}>Підтвердити та увімкнути</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-50 border border-orange-200">
                <KeyRound className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="font-semibold text-orange-900">2FA не активна</div>
                  <div className="text-sm text-orange-700">Рекомендуємо увімкнути для захисту акаунту</div>
                </div>
              </div>
              <Button onClick={startSetup} disabled={loading}>
                {loading ? 'Генерація...' : 'Увімкнути 2FA'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [settings, setSettings] = useState(null);
  const [me, setMe] = useState(user);

  const refreshSettings = async () => {
    try { const s = await api('settings'); setSettings(s); } catch (e) { console.error(e); }
  };
  const refreshUser = async () => {
    try { const u = await api('me', { userId: me.id }); setMe(u); } catch (e) { console.error(e); }
  };

  useEffect(() => { refreshSettings(); }, []);

  const isAdmin = me.role === 'superadmin';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Coins className="w-5 h-5 text-white" /></div>
            <div>
              <div className="font-bold">MaksPay</div>
              <div className="text-xs text-muted-foreground">Crypto Payment Gateway</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">{me.name}</div>
              <div className="text-xs">
                {isAdmin ? <Badge className="bg-emerald-600">Superadmin</Badge> : <Badge variant="secondary">User</Badge>}
                {me.twoFA?.enabled && <Badge variant="outline" className="ml-1">2FA</Badge>}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue={isAdmin ? 'admin' : 'wallet'}>
          <TabsList>
            <TabsTrigger value="wallet"><Wallet className="w-4 h-4 mr-2" />Гаманець</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin"><SettingsIcon className="w-4 h-4 mr-2" />Налаштування</TabsTrigger>}
            <TabsTrigger value="security"><Shield className="w-4 h-4 mr-2" />Безпека</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="wallet">
              {settings && <WalletTab user={me} settings={settings} refreshUser={refreshUser} refreshSettings={refreshSettings} />}
            </TabsContent>
            {isAdmin && (
              <TabsContent value="admin">
                {settings && <AdminTab user={me} settings={settings} refreshSettings={refreshSettings} />}
              </TabsContent>
            )}
            <TabsContent value="security">
              <SecurityTab user={me} refreshUser={refreshUser} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('mp_user') : null;
    if (saved) { try { setUser(JSON.parse(saved)); } catch {} }
  }, []);

  const handleLogin = (u) => { setUser(u); localStorage.setItem('mp_user', JSON.stringify(u)); };
  const handleLogout = () => { setUser(null); localStorage.removeItem('mp_user'); };

  if (!user) return <Login onLogin={handleLogin} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
