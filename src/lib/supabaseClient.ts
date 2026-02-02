import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants";
import { Database } from "../types/supabase";

// Debug logging
console.log("SUPABASE_URL:", SUPABASE_URL);
console.log(
  "SUPABASE_ANON_KEY:",
  SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 20) + "..." : "EMPTY"
);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL and Anon Key must be provided in src/constants.ts");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
