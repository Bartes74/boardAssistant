import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "bartek@dajer.pl";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Dunczyk";
const ADMIN_ROLE = (process.env.ADMIN_ROLE ?? "ADMIN").toUpperCase();

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }

  console.log(`🔐 Creating admin user ${ADMIN_EMAIL}...`);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const existing = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (existing.error) {
    throw existing.error;
  }

  const user = existing.data.users.find((candidate) => candidate.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      app_metadata: { role: ADMIN_ROLE },
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Admin user created with id ${data.user?.id}`);
    return;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: ADMIN_PASSWORD,
    app_metadata: { role: ADMIN_ROLE },
  });

  if (updateError) {
    throw updateError;
  }

  console.log(`ℹ️ Existing user ${ADMIN_EMAIL} updated with role ${ADMIN_ROLE}.`);
}

main().catch((error) => {
  console.error("❌ Failed to ensure admin user:", error.message);
  process.exit(1);
});


