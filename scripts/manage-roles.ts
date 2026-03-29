import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const rl = readline.createInterface({ input, output });

  try {
    console.log("\n--- Fetching Users ---");
    // We select from the public.users table (assuming metadata sync as per codebase)
    const { data: users, error: fetchError } = await supabase
      .from("users")
      .select("id, email, name, role")
      .order("email");

    if (fetchError) {
      console.error("Error fetching users:", fetchError.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log("No users found.");
      process.exit(0);
    }

    console.log("\nID | Email | Name | Role");
    console.log("------------------------");
    users.forEach((u, i) => {
      console.log(`[${i}] ${u.email} (${u.name || "No Name"}) - Current Role: ${u.role}`);
    });

    const indexStr = await rl.question("\nEnter the index of the user to switch role (or 'q' to quit): ");
    if (indexStr.toLowerCase() === 'q') process.exit(0);

    const index = parseInt(indexStr, 10);
    const selectedUser = users[index];

    if (!selectedUser) {
      console.log("Invalid index.");
      process.exit(1);
    }

    console.log(`\nSelected User: ${selectedUser.email}`);
    const nextRole = selectedUser.role === "chapter_admin" ? "coach" : "chapter_admin";
    
    const confirm = await rl.question(`Switch role from '${selectedUser.role}' to '${nextRole}'? (y/n): `);
    if (confirm.toLowerCase() !== 'y') {
      console.log("Aborted.");
      process.exit(0);
    }

    // 1. Update public.users table
    const { error: updateError } = await supabase
      .from("users")
      .update({ role: nextRole })
      .eq("id", selectedUser.id);

    if (updateError) {
      throw new Error(`Failed to update public.users: ${updateError.message}`);
    }

    // 2. Update auth.users metadata to keep it in sync for JWT/Session
    const { error: authError } = await supabase.auth.admin.updateUserById(
      selectedUser.id,
      { user_metadata: { role: nextRole } }
    );

    if (authError) {
      console.warn("Updated public table, but failed to update auth metadata:", authError.message);
    }

    console.log(`\nSuccessfully switched ${selectedUser.email} to role: ${nextRole}`);

  } catch (err: any) {
    console.error("\nAn error occurred:", err.message);
  } finally {
    rl.close();
  }
}

main();
