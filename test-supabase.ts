import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ukbatxpiwjqjdexaouna.supabase.co';
const supabaseKey = 'sb_publishable_l0veVJ8Dj0Sv4HdpPz98oA_isMrVkel';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('students').select('*').limit(1);
  console.log('Result:', JSON.stringify(data?.[0]));
}

check();
