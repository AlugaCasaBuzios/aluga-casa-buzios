import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let adminClient:
  | SupabaseClient
  | undefined;

export function createSupabaseAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "A variável NEXT_PUBLIC_SUPABASE_URL não foi configurada."
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "A variável SUPABASE_SECRET_KEY não foi configurada."
    );
  }

  adminClient = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  return adminClient;
}