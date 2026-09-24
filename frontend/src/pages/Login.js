import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/lib/i18n";
import api, { setToken, apiErr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Login() {
  const { register, setUser } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [busy, setBusy] = useState(false);

  const doLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", { email, password, otp: otp || undefined });
      setToken(data.access_token);
      setUser && setUser(data.user);
      navigate("/dashboard");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && (detail.error === "2FA_REQUIRED" || detail.error === "2FA_INVALID")) {
        setNeeds2FA(true);
        toast.info(detail.message || "Введіть код Google Authenticator");
      } else {
        toast.error(apiErr(err));
      }
    } finally { setBusy(false); }
  };
  const doRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await register(email, password, name); navigate("/dashboard"); }
    catch (err) { toast.error(apiErr(err)); }
    finally { setBusy(false); }
  };
  const google = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4">
      <div className="absolute right-5 top-5">
        <button onClick={() => setLang(lang === "uk" ? "en" : "uk")} data-testid="login-lang"
          className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow">
          {lang.toUpperCase()}
        </button>
      </div>
      <div className="oki-fade-up w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-extrabold text-white shadow-md">M</div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-slate-900">MaksPAY</div>
            <div className="text-xs text-slate-500">{t("login_sub")}</div>
          </div>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="login" data-testid="tab-login">{t("login")}</TabsTrigger>
            <TabsTrigger value="register" data-testid="tab-register">{t("register")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={doLogin} className="space-y-4 pt-4">
              <div>
                <Label>{t("email")}</Label>
                <Input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 rounded-xl" placeholder="merchant@okipays.dev" />
              </div>
              <div>
                <Label>{t("password")}</Label>
                <Input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 rounded-xl" placeholder="••••••••" />
              </div>
              {needs2FA && (
                <div>
                  <Label className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Код Google Authenticator</Label>
                  <Input data-testid="login-otp" value={otp} onChange={(e) => setOtp(e.target.value)} className="mt-1 rounded-xl tracking-widest text-center" placeholder="123 456" inputMode="numeric" maxLength={6} autoFocus />
                </div>
              )}
              <Button data-testid="login-submit" disabled={busy} className="w-full rounded-full bg-blue-600 hover:bg-blue-700">{busy ? "..." : t("login_btn")}</Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={doRegister} className="space-y-4 pt-4">
              <div>
                <Label>{t("name")}</Label>
                <Input data-testid="reg-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-xl" placeholder="Merchant" />
              </div>
              <div>
                <Label>{t("email")}</Label>
                <Input data-testid="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>{t("password")}</Label>
                <Input data-testid="reg-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <Button data-testid="reg-submit" disabled={busy} className="w-full rounded-full bg-blue-600 hover:bg-blue-700">{busy ? "..." : t("register_btn")}</Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" /> OR <div className="h-px flex-1 bg-slate-200" />
        </div>
        <Button data-testid="google-login" onClick={google} variant="outline" className="w-full rounded-full border-slate-300">
          <img alt="g" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="mr-2 h-4 w-4" />
          {t("google_btn")}
        </Button>
      </div>
    </div>
  );
}
