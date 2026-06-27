import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isActiveFilter = process.argv.includes("--active");
  const activeEmails = [
    "coolboyrockstothecore@gmail.com",
    "saimanaswi416@gmail.com",
    "rsvargh2@asu.edu",
    "pragyanjyoti8@gmail.com",
    "sseela1@asu.edu",
    "chirunder@gmail.com"
  ];

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

  try {
    console.log(`\n--- Fetching ${isActiveFilter ? "Active " : "All "}User Details ---`);
    
    // Join with chapters to show the chapter name instead of just the ID
    let query = supabase
      .from("users")
      .select(`
        id,
        email,
        name,
        role,
        chapter_id,
        phone,
        location,
        bio,
        chapters (
          name
        )
      `);

    if (isActiveFilter) {
      query = query.in("email", activeEmails);
    }

    const { data: users, error: fetchError } = await query.order("email", { ascending: false });

    if (fetchError) {
      console.error("Error fetching users:", fetchError.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log("No users found.");
      process.exit(0);
    }

    console.log("\n" + "=".repeat(80));
    users.forEach((u, i) => {
      console.log(`[${i}] ${u.email}`);
      console.log(`    Name:     ${u.name || "N/A"}`);
      console.log(`    Role:     ${u.role}`);
      console.log(`    Chapter:  ${Array.isArray(u.chapters) && u.chapters[0]?.name ? u.chapters[0].name : "Global / None"} (${u.chapter_id || "N/A"})`);
      console.log(`    Location: ${u.location || "N/A"}`);
      console.log(`    Phone:    ${u.phone || "N/A"}`);
      if (u.bio) {
        console.log(`    Bio:      ${u.bio.substring(0, 100)}${u.bio.length > 100 ? "..." : ""}`);
      }
      console.log("-".repeat(80));
    });
    
    console.log(`Total Users: ${users.length}`);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("\nAn error occurred:", message);
  }
}

main();
