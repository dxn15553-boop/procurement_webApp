import { neon } from "@neondatabase/serverless";

export interface SourceRequestRecord {
  id: string;
  requester_id: string;
  department_id: string;
  description: string;
  priority: string | null;
  request_date: string | Date | null;
  required_by_date: string | Date | null;
  purpose_justification: string | null;
  status: string;
  assigned_employee_id: string | null;
  srf_number: string | null;
  srf_date: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  department_name?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  requester_designation?: string | null;
  handler_name?: string | null;
  handler_email?: string | null;
}

let cachedSourceSql: ReturnType<typeof neon> | null = null;

function getSourceSql() {
  if (!cachedSourceSql) {
    const url = process.env.SOURCE_DATABASE_URL || 'postgresql://neondb_owner:npg_nDKjS7bBW5vz@ep-misty-rice-ayivstqy-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    cachedSourceSql = neon(url);
  }
  return cachedSourceSql;
}

/**
 * Executes a query with a 1.5s retry to handle Neon serverless compute cold-starts
 */
async function executeWithRetry<T>(fn: (sql: ReturnType<typeof neon>) => Promise<T>): Promise<T> {
  const sql = getSourceSql();
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await fn(sql);
    } catch (err: any) {
      if (attempt === 1) {
        // Wait 1.5s for Neon serverless compute cold-start to wake up
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Query failed after retry");
}

/**
 * Normalizes user-entered Source No, e.g. "0004" -> "SRC-2026-0004" or "SRC-2026-0004"
 */
export function normalizeSourceNo(input: string): string {
  const trimmed = input.trim().toUpperCase();
  if (trimmed.startsWith("SRC-")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;
  const year = new Date().getFullYear();
  if (digits.length <= 4) {
    return `SRC-${year}-${digits.padStart(4, "0")}`;
  }
  return `SRC-${digits}`;
}

/**
 * Fetch a single source request by Source No from the Source App database
 */
export async function fetchSourceRequestByNo(sourceNo: string): Promise<SourceRequestRecord | null> {
  const normalized = normalizeSourceNo(sourceNo);

  return executeWithRetry(async (sql) => {
    const rows = (await sql`
      SELECT 
        sr.*,
        d.name as department_name,
        COALESCE(sr.requester_name, p.full_name) as requester_name,
        p.email as requester_email,
        sr.requester_designation as requester_designation,
        hp.full_name as handler_name,
        hp.email as handler_email
      FROM source_requests sr
      LEFT JOIN departments d ON sr.department_id = d.id
      LEFT JOIN profiles p ON sr.requester_id = p.id
      LEFT JOIN profiles hp ON sr.assigned_employee_id = hp.id
      WHERE sr.id ILIKE ${normalized} OR sr.id ILIKE ${`%${sourceNo.trim()}%`}
      LIMIT 1
    `) as any[];

    if (!rows || rows.length === 0) return null;
    return rows[0] as SourceRequestRecord;
  });
}

/**
 * Fetch all source requests assigned to a specific handler from the Source App database
 */
export async function fetchAssignedRequestsForHandler(handlerEmail: string, handlerName?: string): Promise<SourceRequestRecord[]> {
  const cleanEmail = handlerEmail.trim().toLowerCase();
  const cleanName = (handlerName || "").trim().toLowerCase();

  return executeWithRetry(async (sql) => {
    const rows = (await sql`
      SELECT 
        sr.*,
        d.name as department_name,
        COALESCE(sr.requester_name, p.full_name) as requester_name,
        p.email as requester_email,
        sr.requester_designation as requester_designation,
        hp.full_name as handler_name,
        hp.email as handler_email
      FROM source_requests sr
      LEFT JOIN departments d ON sr.department_id = d.id
      LEFT JOIN profiles p ON sr.requester_id = p.id
      LEFT JOIN profiles hp ON sr.assigned_employee_id = hp.id
      WHERE 
        (LOWER(hp.email) = ${cleanEmail} OR LOWER(hp.full_name) ILIKE ${`%${cleanName}%`})
        OR (sr.status IN ('Assigned', 'Vendor Evaluation', 'PR Created', 'PO Created', 'Payment Pending', 'Delivered', 'Completed') 
            AND (LOWER(hp.email) = ${cleanEmail} OR LOWER(hp.full_name) ILIKE ${`%${cleanName}%`}))
      ORDER BY sr.created_at DESC
    `) as any[];

    return (rows || []) as SourceRequestRecord[];
  });
}

/**
 * Fetch all assigned requests across all handlers (used by Managers or system sync)
 */
export async function fetchAllAssignedSourceRequests(): Promise<SourceRequestRecord[]> {
  return executeWithRetry(async (sql) => {
    const rows = (await sql`
      SELECT 
        sr.*,
        d.name as department_name,
        COALESCE(sr.requester_name, p.full_name) as requester_name,
        p.email as requester_email,
        sr.requester_designation as requester_designation,
        hp.full_name as handler_name,
        hp.email as handler_email
      FROM source_requests sr
      LEFT JOIN departments d ON sr.department_id = d.id
      LEFT JOIN profiles p ON sr.requester_id = p.id
      LEFT JOIN profiles hp ON sr.assigned_employee_id = hp.id
      WHERE sr.assigned_employee_id IS NOT NULL 
         OR sr.status IN ('Assigned', 'Vendor Evaluation', 'PR Created', 'PO Created', 'Payment Pending', 'Delivered', 'Completed')
      ORDER BY sr.created_at DESC
    `) as any[];

    return (rows || []) as SourceRequestRecord[];
  });
}

/**
 * Fetch all source requests that have completed internal approvals and are eligible for RFQ / Vendor Selection
 */
export async function fetchEligibleSourceRequestsForRfq(): Promise<SourceRequestRecord[]> {
  return executeWithRetry(async (sql) => {
    const rows = (await sql`
      SELECT 
        sr.*,
        d.name as department_name,
        COALESCE(sr.requester_name, p.full_name) as requester_name,
        p.email as requester_email,
        sr.requester_designation as requester_designation,
        hp.full_name as handler_name,
        hp.email as handler_email
      FROM source_requests sr
      LEFT JOIN departments d ON sr.department_id = d.id
      LEFT JOIN profiles p ON sr.requester_id = p.id
      LEFT JOIN profiles hp ON sr.assigned_employee_id = hp.id
      WHERE sr.status IN ('Procurement Approved', 'Section Manager Assignment', 'Assigned', 'Vendor Evaluation', 'PR Created', 'PO Created', 'Payment Pending', 'Delivered', 'Completed')
      ORDER BY sr.created_at DESC
    `) as any[];

    return (rows || []) as SourceRequestRecord[];
  });
}

/**
 * Formats full source info into standard sourceDescription string
 */
export function formatSourceDescription(src: SourceRequestRecord): string {
  let text = (src.description || "").trim();
  const details: string[] = [];

  if (src.purpose_justification) {
    details.push(`Justification: ${src.purpose_justification}`);
  }
  if (src.priority) {
    details.push(`Priority: ${src.priority}`);
  }
  if (src.required_by_date) {
    try {
      const d = new Date(src.required_by_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      details.push(`Required By: ${d}`);
    } catch {}
  }
  const rName = src.requester_name;
  if (rName) {
    const rDesig = src.requester_designation ? ` (${src.requester_designation})` : '';
    details.push(`Requester: ${rName}${rDesig}`);
  }

  if (details.length > 0 && !text.includes('[Source Details]')) {
    text = `${text}\n\n[Source Details]\n• ${details.join('\n• ')}`;
  }

  return text;
}
