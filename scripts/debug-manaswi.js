const { createClient } = require('@supabase/supabase-js');
(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sc = createClient(url, key);
  const { data, error } = await sc.from('users').select('email, role, chapter_id').ilike('email', 'saimanaswi416@gmail.com');
  console.log(JSON.stringify({data, error}, null, 2));
})();