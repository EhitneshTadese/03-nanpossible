import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const emailToFind = "coolboyrockstothecore@gmail.com"; // Found from previous list
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing credentials");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("id, email, role")
    .ilike("name", "Chiruman")
    .single();

  if (fetchError || !user) {
    console.error("User not found or error:", fetchError?.message);
    process.exit(1);
  }

  console.log(`Updating ${user.email} from ${user.role} to chapter_admin...`);

  const { error: updateError } = await supabase
    .from("users")
    .update({ role: "chapter_admin" })
    .eq("id", user.id);

  if (updateError) {
    console.error("Update error:", updateError.message);
    process.exit(1);
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(
    user.id,
    { user_metadata: { role: "chapter_admin" } }
  );

  if (authError) {
    console.error("Auth metadata update error:", authError.message);
  } else {
    console.log("Success!");
  }
}

main();
