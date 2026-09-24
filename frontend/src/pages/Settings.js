import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, RefreshCw, Check, Shield, ShieldCheck, Network as NetIcon, Coins, KeyRound } from "lucide-react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoinIcon } from "@/components/common";

const FEE_COINS = ["USDT", "USDC", "BTC", "ETH", "BNB", "TRX", "SOL", "LTC"];

const COLORS = ["#94A3B8", "#1E3A5F", "#3B82F6", "#14B8A6", "#84CC16", "#2563EB",
  "#A855F7", "#EF4444", "#F87171", "#F59E0B", "#EAB308", "#92400E"];

export default function Settings() {
  const { t } = useLang();
  const { user, checkAuth } = useAuth();
  const [m, setM] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const isAdmin = user?.role === "admin";

  useEffect(() => { api.get("/merchant").then((r) => setM(r.data.data)).catch(() => {}); }, []);
  if (!m) return <div className="text-slate-400">…</div>;

  const save = async () => {
    try {
      const { data } = await api.put("/merchant", {
        name: m.name, home_url: m.home_url, result_url: m.result_url,
        brand_color: m.brand_color, description: m.description,
        auto_swap: !!m.auto_swap, auto_swap_to: m.auto_swap_to || "USDT",
        fees: m.fees || {},
      });
      setM(data.data); toast.success(t("saved"));
    } catch (e) { toast.error(apiErr(e)); }
  };
  const regen = async () => {
    try { const { data } = await api.post("/merchant/regenerate"); setM(data.data); toast.success(t("regenerate")); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const copy = (v) => { navigator.clipboard.writeText(v); toast.success(t("copied")); };

  const setFee = (iso, key, val) => {
    const fees = { ...(m.fees || {}) };
    fees[iso] = { ...(fees[iso] || {}), [key]: val === "" ? "" : Number(val) };
    setM({ ...m, fees });
  };
  const feeVal = (iso, key) => {
    const v = m.fees?.[iso]?.[key];
    return v === undefined || v === null ? "" : v;
  };

  return (
    <div className="space-y-6 oki-fade-up">
      <h1 className="text-2xl font-bold text-slate-900">{t("settings")}</h1>
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <Tabs defaultValue="profile">
          <TabsList className="rounded-xl flex-wrap h-auto">
            <TabsTrigger value="profile" data-testid="tab-profile">{t("profile")}</TabsTrigger>
            <TabsTrigger value="merchant" data-testid="tab-merchant">{t("merchant")}</TabsTrigger>
            <TabsTrigger value="fees" data-testid="tab-fees">{t("fees")}</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security"><Shield className="mr-1 h-4 w-4" />Безпека</TabsTrigger>
            {isAdmin && <TabsTrigger value="platform" data-testid="tab-platform" className="bg-emerald-50 data-[state=active]:bg-emerald-100"><Coins className="mr-1 h-4 w-4" />Платформа</TabsTrigger>}
            {isAdmin && <TabsTrigger value="networks" data-testid="tab-networks" className="bg-emerald-50 data-[state=active]:bg-emerald-100"><NetIcon className="mr-1 h-4 w-4" />Мережі</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="pt-6">
            <div className="max-w-md space-y-4">
              <div><Label>{t("name")}</Label><Input value={user?.name || ""} disabled className="rounded-xl mt-1 bg-slate-50" /></div>
              <div><Label>{t("email")}</Label><Input value={user?.email || ""} disabled className="rounded-xl mt-1 bg-slate-50" /></div>
              <div className="text-xs text-slate-400">Провайдер входу: {user?.auth_provider || "password"}</div>
            </div>
          </TabsContent>

          <TabsContent value="merchant" className="pt-6">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <div className="mb-3 text-lg font-bold text-slate-900">{t("merchant_info")}</div>
                  <div className="space-y-3">
                    <div><Label>{t("title")} *</Label><Input data-testid="merchant-name" value={m.name || ""} onChange={(e) => setM({ ...m, name: e.target.value })} className="rounded-xl mt-1" /></div>
                    <div><Label>{t("home_url")}</Label><Input data-testid="merchant-home" value={m.home_url || ""} onChange={(e) => setM({ ...m, home_url: e.target.value })} className="rounded-xl mt-1" placeholder="https://www.example.io" /></div>
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-lg font-bold text-slate-900">{t("api_settings")}</div>
                  <div className="mb-2 text-xs text-slate-400">{t("api_key_note")}</div>
                  <div className="space-y-3">
                    <div><Label>{t("result_url")}</Label><Input data-testid="merchant-result-url" value={m.result_url || ""} onChange={(e) => setM({ ...m, result_url: e.target.value })} className="rounded-xl mt-1" placeholder="https://site.com/webhook" /></div>
                    <div><Label>{t("token")}</Label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                        <code data-testid="merchant-token" className="flex-1 truncate text-xs">{m.token}</code>
                        <Button size="sm" variant="ghost" data-testid="copy-token" onClick={() => copy(m.token)}><Copy className="mr-1 h-3.5 w-3.5" />{t("copy")}</Button>
                      </div>
                    </div>
                    <div><Label>{t("secret")}</Label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                        <code data-testid="merchant-secret" className="flex-1 truncate text-xs">{showSecret ? m.secret : "•".repeat(40)}</code>
                        <Button size="icon" variant="ghost" data-testid="toggle-secret" onClick={() => setShowSecret(!showSecret)}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        <Button size="icon" variant="ghost" data-testid="copy-secret" onClick={() => copy(m.secret)}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <Button data-testid="regen-btn" variant="outline" onClick={regen} className="rounded-full border-slate-300"><RefreshCw className="mr-2 h-4 w-4" />{t("regenerate")}</Button>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 text-lg font-bold text-slate-900">{t("branding")}</div>
                <Label>{t("color")}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} data-testid={`color-${c}`} onClick={() => setM({ ...m, brand_color: c })}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition"
                      style={{ background: c, borderColor: m.brand_color === c ? "#0f172a" : "transparent" }}>
                      {m.brand_color === c && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
                <div className="mt-6"><Label>{t("description")}</Label>
                  <Textarea data-testid="merchant-desc" value={m.description || ""} onChange={(e) => setM({ ...m, description: e.target.value })} className="rounded-xl mt-1" rows={4} placeholder="Зробіть назву вашого бізнесу зрозумілою для клієнтів" /></div>

                <div className="mt-8">
                  <div className="mb-3 text-lg font-bold text-slate-900">{t("auto_conv")}</div>
                  <div className="flex items-start justify-between rounded-2xl border border-slate-100 p-4">
                    <div className="pr-4">
                      <div className="font-semibold text-slate-800">{t("auto_swap")}</div>
                      <div className="text-xs text-slate-400">{t("auto_swap_desc")}</div>
                    </div>
                    <Switch data-testid="auto-swap-toggle" checked={!!m.auto_swap} onCheckedChange={(v) => setM({ ...m, auto_swap: v })} />
                  </div>
                  {m.auto_swap && (
                    <div className="mt-3 max-w-[220px]"><Label>{t("convert_to")}</Label>
                      <Select value={m.auto_swap_to || "USDT"} onValueChange={(v) => setM({ ...m, auto_swap_to: v })}>
                        <SelectTrigger data-testid="auto-swap-to" className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200">{["USDT", "USDC", "ETH", "BNB"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button data-testid="save-merchant" onClick={save} className="rounded-full bg-blue-600 hover:bg-blue-700 px-8">{t("save")}</Button>
            </div>
          </TabsContent>

          <TabsContent value="fees" className="pt-6">
            <div className="mb-4 max-w-2xl text-sm text-slate-500">{t("fees_desc")}</div>
            <div className="oki-scroll overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="py-2">{t("currency")}</th>
                    <th className="text-center" colSpan={2}>{t("fee_in")}</th>
                    <th className="text-center" colSpan={2}>{t("fee_out")}</th>
                  </tr>
                  <tr className="text-left text-[11px] text-slate-300">
                    <th></th><th className="font-normal">{t("fee_pct")}</th><th className="font-normal">{t("fee_fixed")}</th>
                    <th className="font-normal">{t("fee_pct")}</th><th className="font-normal">{t("fee_fixed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {FEE_COINS.map((iso) => (
                    <tr key={iso} data-testid={`fee-row-${iso}`} className="border-t border-slate-100">
                      <td className="py-2.5"><div className="flex items-center gap-2"><CoinIcon iso={iso} size={28} /><span className="font-semibold text-slate-700">{iso}</span></div></td>
                      <td className="pr-2"><Input data-testid={`fee-${iso}-in-pct`} type="number" step="0.01" value={feeVal(iso, "in_percent")} onChange={(e) => setFee(iso, "in_percent", e.target.value)} className="h-9 w-20 rounded-lg" placeholder="0" /></td>
                      <td className="pr-2"><Input data-testid={`fee-${iso}-in-fix`} type="number" step="0.0001" value={feeVal(iso, "in_fixed")} onChange={(e) => setFee(iso, "in_fixed", e.target.value)} className="h-9 w-24 rounded-lg" placeholder="0" /></td>
                      <td className="pr-2"><Input data-testid={`fee-${iso}-out-pct`} type="number" step="0.01" value={feeVal(iso, "out_percent")} onChange={(e) => setFee(iso, "out_percent", e.target.value)} className="h-9 w-20 rounded-lg" placeholder="0" /></td>
                      <td><Input data-testid={`fee-${iso}-out-fix`} type="number" step="0.0001" value={feeVal(iso, "out_fixed")} onChange={(e) => setFee(iso, "out_fixed", e.target.value)} className="h-9 w-24 rounded-lg" placeholder="0" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 flex justify-end">
              <Button data-testid="save-fees" onClick={save} className="rounded-full bg-blue-600 hover:bg-blue-700 px-8">{t("save")}</Button>
            </div>
          </TabsContent>
          <TabsContent value="security" className="pt-6">
            <SecurityTab onChanged={checkAuth} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="platform" className="pt-6">
              <PlatformTab user={user} />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="networks" className="pt-6">
              <NetworksTab user={user} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

// ---------------------- Security (2FA) Tab ----------------------
function SecurityTab({ onChanged }) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [otp, setOtp] = useState("");
  const [disableOtp, setDisableOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/security/2fa/status")
      .then((r) => setEnabled(!!r.data?.data?.enabled))
      .catch(() => {});
  }, []);

  const startSetup = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/security/2fa/setup");
      setSetupData(data.data);
    } catch (e) { toast.error(apiErr(e)); } finally { setLoading(false); }
  };
  const enable = async () => {
    try {
      await api.post("/security/2fa/enable", { otp });
      toast.success("2FA увімкнено!");
      setSetupData(null); setOtp(""); setEnabled(true);
      onChanged && onChanged();
    } catch (e) { toast.error(apiErr(e)); }
  };
  const disable = async () => {
    try {
      await api.post("/security/2fa/disable", { otp: disableOtp });
      toast.success("2FA вимкнено");
      setDisableOtp(""); setEnabled(false);
      onChanged && onChanged();
    } catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={"w-12 h-12 rounded-xl flex items-center justify-center " + (enabled ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600")}>
            {enabled ? <ShieldCheck className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">Google Authenticator (2FA)</div>
            <div className="text-sm text-slate-500">
              {enabled ? "Активна — вхід та критичні дії захищені кодом" : "Не увімкнена — рекомендуємо активувати"}
            </div>
          </div>
          {enabled ? <Badge className="ml-auto bg-emerald-600">УВІМКНЕНА</Badge> : <Badge variant="secondary" className="ml-auto">ВИМКНЕНА</Badge>}
        </div>
        <div className="text-sm text-slate-600 mb-4">
          Двофакторна автентифікація (TOTP) додає додатковий рівень безпеки: після пароля вам треба ввести 6-значний код з застосунку Google Authenticator (або Authy, 1Password).
        </div>

        {!enabled && !setupData && (
          <Button data-testid="2fa-start-btn" onClick={startSetup} disabled={loading}>{loading ? "Генерація…" : "Увімкнути 2FA"}</Button>
        )}

        {!enabled && setupData && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <img src={setupData.qr_data_url} alt="QR" className="w-48 h-48 border rounded-lg bg-white" />
              <div className="flex-1 space-y-2 text-sm">
                <div className="font-semibold">Кроки:</div>
                <div>1. Відкрийте Google Authenticator</div>
                <div>2. Натисніть "+" → "Сканувати QR-код" → скануйте</div>
                <div>3. Або введіть секрет вручну:</div>
                <div className="font-mono text-xs bg-slate-100 p-2 rounded break-all select-all">{setupData.secret}</div>
                <div>4. Введіть 6-значний код з застосунку нижче:</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Input data-testid="2fa-code" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123 456" inputMode="numeric" maxLength={6} className="max-w-xs rounded-xl tracking-widest text-center" />
              <Button data-testid="2fa-enable-btn" onClick={enable}>Підтвердити і увімкнути</Button>
            </div>
          </div>
        )}

        {enabled && (
          <div className="space-y-3">
            <Label>Введіть поточний код для вимкнення 2FA</Label>
            <div className="flex gap-2">
              <Input data-testid="2fa-disable-code" value={disableOtp} onChange={(e) => setDisableOtp(e.target.value)} placeholder="6 цифр" inputMode="numeric" maxLength={6} className="max-w-xs rounded-xl tracking-widest text-center" />
              <Button data-testid="2fa-disable-btn" variant="destructive" onClick={disable}>Вимкнути 2FA</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------- Platform Fees Tab (superadmin only) ----------------------
function PlatformTab({ user }) {
  const [pf, setPf] = useState(null);
  const [otp, setOtp] = useState("");
  useEffect(() => {
    api.get("/admin/platform-fees").then((r) => setPf(r.data.data)).catch((e) => toast.error(apiErr(e)));
  }, []);
  if (!pf) return <div className="text-slate-400">…</div>;
  const save = async () => {
    try {
      const { data } = await api.put("/admin/platform-fees", {
        deposit_fee: Number(pf.deposit_fee),
        withdrawal_fee_cabinet: Number(pf.withdrawal_fee_cabinet),
        withdrawal_fee_api: Number(pf.withdrawal_fee_api),
        otp: otp || undefined,
      });
      setPf(data.data); setOtp("");
      toast.success("Комісії платформи оновлено");
    } catch (e) { toast.error(apiErr(e)); }
  };
  const pool = pf.pool_by_iso || {};
  const poolEntries = Object.entries(pool).filter(([, v]) => v > 0);
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-transparent p-5">
        <div className="text-sm text-emerald-800 font-semibold mb-1">👑 Тільки для суперадміністратора MaksPay</div>
        <div className="text-xs text-slate-600">Ці комісії застосовуються глобально до всіх мерчантів/користувачів платформи. Джерело доходу.</div>
      </div>

      <div className="rounded-2xl border border-slate-100 p-5 space-y-4">
        <div>
          <Label className="text-slate-700 font-semibold">Комісія на вхід (депозит) — {pf.deposit_fee} USDT (flat)</Label>
          <Input data-testid="pf-deposit" type="number" step="0.01" value={pf.deposit_fee} onChange={(e) => setPf({ ...pf, deposit_fee: e.target.value })} className="rounded-xl mt-1 max-w-xs" />
          <p className="text-xs text-slate-400 mt-1">Приклад: при 0.5 USDT — якщо відправник надіслав 10 USDT, на баланс одержувача зараховується 9.5 USDT, а 0.5 йде в пул платформи.</p>
        </div>
        <div>
          <Label className="text-slate-700 font-semibold">Комісія на вивід (з особистого кабінету)</Label>
          <Input data-testid="pf-wd-cab" type="number" step="0.01" value={pf.withdrawal_fee_cabinet} onChange={(e) => setPf({ ...pf, withdrawal_fee_cabinet: e.target.value })} className="rounded-xl mt-1 max-w-xs" />
          <p className="text-xs text-slate-400 mt-1">Стандартна комісія для прямого виводу з кабінету.</p>
        </div>
        <div>
          <Label className="text-slate-700 font-semibold">Комісія на вивід через API</Label>
          <Input data-testid="pf-wd-api" type="number" step="0.01" value={pf.withdrawal_fee_api} onChange={(e) => setPf({ ...pf, withdrawal_fee_api: e.target.value })} className="rounded-xl mt-1 max-w-xs" />
          <p className="text-xs text-slate-400 mt-1">Для API-виводів (автоматичні перекази від мерчантів).</p>
        </div>
        {user?.two_fa?.enabled && (
          <div>
            <Label className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Код Google Authenticator</Label>
            <Input data-testid="pf-otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123 456" className="rounded-xl mt-1 max-w-xs" inputMode="numeric" maxLength={6} />
          </div>
        )}
        <div className="flex justify-end">
          <Button data-testid="pf-save" onClick={save} className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-8">Зберегти</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 p-5">
        <div className="text-sm text-slate-500 mb-2">💰 Пул платформи (накопичені комісії)</div>
        {poolEntries.length === 0 ? (
          <div className="text-sm text-slate-400">Ще нічого не накопичено</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {poolEntries.map(([iso, v]) => (
              <div key={iso} className="rounded-xl bg-slate-50 border p-3">
                <div className="text-xs text-slate-500">{iso}</div>
                <div className="text-lg font-bold text-emerald-700">{Number(v).toFixed(6)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------- Networks Tab (superadmin only) ----------------------
function NetworksTab({ user }) {
  const [nets, setNets] = useState([]);
  const [otp, setOtp] = useState("");
  const load = () => api.get("/admin/networks").then((r) => setNets(r.data.data)).catch((e) => toast.error(apiErr(e)));
  useEffect(() => { load(); }, []);
  const toggle = async (n, val) => {
    try {
      await api.put("/admin/networks", { network_id: n.network_id, enabled: val, otp: otp || undefined });
      toast.success(`${n.name}: ${val ? "увімкнено" : "вимкнено"}`);
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-transparent p-5">
        <div className="text-sm text-emerald-800 font-semibold mb-1">👑 Керування платіжними мережами</div>
        <div className="text-xs text-slate-600">Вимкнення тумблера миттєво зупиняє прийом та вивід коштів у відповідній мережі на всій платформі.</div>
      </div>
      {user?.two_fa?.enabled && (
        <div className="rounded-2xl border border-slate-100 p-3">
          <Label className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Код 2FA для змін</Label>
          <Input data-testid="net-otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123 456" className="rounded-xl mt-1 max-w-xs" inputMode="numeric" maxLength={6} />
        </div>
      )}
      <div className="space-y-2">
        {nets.map((n) => (
          <div key={n.network_id} data-testid={`net-row-${n.network_id}`} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">{n.iso}</div>
              <div>
                <div className="font-semibold text-slate-900">{n.name}</div>
                <div className="text-xs text-slate-500 capitalize">{n.chain}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={n.enabled ? "default" : "secondary"} className={n.enabled ? "bg-emerald-600" : ""}>{n.enabled ? "Активна" : "Вимкнена"}</Badge>
              <Switch data-testid={`net-toggle-${n.network_id}`} checked={!!n.enabled} onCheckedChange={(v) => toggle(n, v)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
