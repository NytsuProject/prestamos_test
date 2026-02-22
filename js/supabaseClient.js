import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = "https://ehnvydaqzwtneapcgdig.supabase.co";
const supabaseKey = "sb_publishable_p_dw9LY_ZcTbq4JZKruiOQ_RooKM5j2";

export const db = createClient(supabaseUrl, supabaseKey);