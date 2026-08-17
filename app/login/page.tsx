"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "./login.css";

function authRedirectOrigin() {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:3001";
  }
  return window.location.origin;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  useEffect(() => {
    if (window.location.hostname !== "localhost") return;
    window.location.replace(`http://127.0.0.1:3001${window.location.pathname}${window.location.search}${window.location.hash}`);
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = createClient();
    if (!supabase) {
      sessionStorage.setItem("lpbrain_demo_user", email);
      window.location.href = "/";
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${authRedirectOrigin()}/auth/callback` } });
    console.info("[login] pkceVerifierCookiePresent", document.cookie.split(";").some((cookie) => cookie.trim().split("=")[0].includes("code-verifier")));
    if (error) setError(error.message.toLowerCase().includes("rate limit") ? "Too many sign-in emails were requested. Please wait before requesting another sign-in link." : error.message);
    else setSent(true);
  }
  return <main className="login-page"><section className="login-brand"><div className="login-logo"><b>LP</b> Brain</div><div><label>AI FUNDRAISING CHIEF OF STAFF</label><h1>Relationship intelligence for emerging venture fund managers.</h1><p>LP Brain helps emerging venture fund managers prepare LP meetings, capture relationship intelligence, identify high-potential LP opportunities, and execute the next best action.</p><ul><li><Check />Fund DNA and structured LP DNA</li><li><Check />Evidence-backed relationship paths</li><li><Check />Recommendation feedback and outcome history</li></ul></div><footer>Built for emerging venture funds.</footer></section><section className="login-form"><form onSubmit={submit}>{sent ? <div className="login-sent"><Sparkles /><h2>Check your inbox</h2><p>We sent a secure sign-in link to <b>{email}</b>.</p></div> : <><small>WELCOME TO LP BRAIN</small><h2>Your AI Fundraising Chief of Staff starts here.</h2><p>Sign in with your work email. No password required.</p><label>Email address</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@fund.com" /><button>Continue with email <ArrowRight /></button>{error && <em>{error}</em>}{!supabaseConfigured && <div className="demo-note"><Sparkles /> Local demo mode is active because Supabase keys are not configured.</div>}</>}</form></section></main>;
}
