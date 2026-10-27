export interface SupabaseVendor {
  id: string | number;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string | null;
  vendor_category?: string | null;
  category_list?: string[];
  status: string; // 'approved' | 'Observation' | 'rejected'
  pan_number?: string | null;
  gst_number?: string | null;
  service_capabilities?: string | null;
  oem_brands?: string | null;
  created_at?: string;
}

const SUPABASE_URL = process.env.VENDOR_SUPABASE_URL || 'https://nmiqhmngdvyblfizkfjp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VENDOR_SUPABASE_ANON_KEY || 'sb_publishable_bUQLrA9jZvdiHZRI1-YMGg_p3T8W0L0';

/**
 * Fetch vendors directly from the Vendor Master (Supabase) via server-side REST API
 */
export async function getVendorsFromMaster(options?: {
  status?: string;
  category?: string;
  search?: string;
}): Promise<SupabaseVendor[]> {
  try {
    let url = `${SUPABASE_URL}/rest/v1/vendors?select=id,company_name,contact_person,email,phone,vendor_category,status,pan_number,gst_number,service_capabilities,created_at&order=company_name.asc`;

    if (options?.status && options.status !== 'all') {
      url += `&status=eq.${encodeURIComponent(options.status)}`;
    }

    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 }, // Cache for 30s
    });

    if (!res.ok) {
      console.error(`Failed to fetch vendors from Supabase: ${res.status} ${res.statusText}`);
      return [];
    }

    let vendors: SupabaseVendor[] = await res.json();

    // Map category_list array from vendor_category comma-separated string
    vendors = vendors.map(v => ({
      ...v,
      category_list: v.vendor_category ? v.vendor_category.split(',').map((s: string) => s.trim()) : []
    }));

    // Client-side text filter if search query is provided
    if (options?.search) {
      const q = options.search.toLowerCase();
      vendors = vendors.filter(v =>
        v.company_name?.toLowerCase().includes(q) ||
        v.contact_person?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.vendor_category?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (options?.category && options.category !== 'all') {
      const cat = options.category.toLowerCase();
      vendors = vendors.filter(v =>
        v.vendor_category?.toLowerCase().includes(cat) ||
        v.category_list?.some(c => c.toLowerCase().includes(cat))
      );
    }

    return vendors;
  } catch (err) {
    console.error('Error querying vendor master:', err);
    return [];
  }
}

/**
 * Fetch a single vendor by ID from the Supabase Vendor Master
 */
export async function getVendorByIdFromMaster(vendorId: string | number): Promise<SupabaseVendor | null> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/vendors?id=eq.${encodeURIComponent(vendorId)}&select=*`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return null;
    const data: SupabaseVendor[] = await res.json();
    return data[0] || null;
  } catch (err) {
    console.error(`Error fetching vendor ${vendorId}:`, err);
    return null;
  }
}
