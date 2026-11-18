// Platform values are read at use time.
export const ENV = {
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get forgeApiUrl() {
    return process.env.MANUS_API_URL ?? "";
  },
  get forgeApiKey() {
    return process.env.MANUS_API_KEY ?? "";
  },
  // Supabase configuration
  get supabaseUrl() {
    return process.env.SUPABASE_URL ?? "";
  },
  get supabaseServiceKey() {
    return process.env.SUPABASE_SECRET_KEY ?? "";
  },
  get supabasePublishableKey() {
    return process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  },
};
