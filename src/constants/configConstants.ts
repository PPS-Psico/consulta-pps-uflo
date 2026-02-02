export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export const testSupabaseConnection = async () => {
  console.log("=== TESTING SUPABASE CONNECTION ===");
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
    });
    const status = response.status;
    console.log("Supabase API Status:", status);
    if (status === 200) {
      console.log("✅ SUCCESS: Supabase connection is valid!");
      return { success: true, status };
    } else if (status === 401) {
      console.log("❌ ERROR: Invalid API Key");
      return { success: false, status, error: "Invalid API Key" };
    } else {
      console.log(`❌ ERROR: Unexpected status ${status}`);
      return { success: false, status, error: `Status ${status}` };
    }
  } catch (error: any) {
    console.error("❌ ERROR: Connection failed", error);
    return { success: false, error: error.message };
  }
};
