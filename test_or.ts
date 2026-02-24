import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase
        .from('order_items')
        .select(`
            id, part_no,
            orders!inner(
                clients!inner(name)
            )
        `)
        .or('part_no.ilike.%test%,orders.clients.name.ilike.%test%')
        .limit(5);

    console.log("Error:", error);
    console.log("Data:", JSON.stringify(data, null, 2));
}

test();
