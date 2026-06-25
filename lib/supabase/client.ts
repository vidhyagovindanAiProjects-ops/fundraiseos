import { createBrowserClient } from "@supabase/ssr";
export function createClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;return url&&key?createBrowserClient(url,key):null}
