"use client";
import { useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "./login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = createClient();
    if (!supabase) {
      sessionStorage.setItem("lpbrain_demo_user", email);
      window.location.href = "/";
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/` } });
    if (error) setError(error.message);
    else setSent(true);
  }
  return <main className="login-page"><section className="login-brand"><div className="login-logo"><b>LP</b> Brain</div><div><label>LP DISCOVERY & RELATIONSHIP INTELLIGENCE</label><h1>Find and convert the highest-probability LPs for your fund.</h1><p>LP Brain helps emerging venture fund managers close LP commitments faster by identifying the right LP categories, uncovering warm introduction paths, and creating an actionable fundraising strategy.</p><ul><li><Check />Ideal LP profiles, generated from Fund DNA</li><li><Check />Warm introduction paths, prioritized</li><li><Check />Weekly fundraising actions, focused on conversion</li></ul></div><footer>Built for emerging venture funds.</footer></section><section className="login-form"><form onSubmit={submit}>{sent ? <div className="login-sent"><Sparkles /><h2>Check your inbox</h2><p>We sent a secure sign-in link to <b>{email}</b>.</p></div> : <><small>WELCOME TO LP BRAIN</small><h2>Your LP matchmaker and fundraising strategist starts here.</h2><p>Sign in with your work email. No password required.</p><label>Email address</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@fund.com" /><button>Continue with email <ArrowRight /></button>{error && <em>{error}</em>}<div className="demo-note"><Sparkles /> Without Supabase keys, any email opens the local demo.</div></>}</form></section></main>;
}
