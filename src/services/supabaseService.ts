import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Certificate, CertificateType, PerformanceLevel } from '../types/certificate';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('http') &&
    !SUPABASE_URL.includes('your-project')
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Connected to Supabase Central Database');
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
    }
  }
  return supabaseInstance;
}

/**
 * Maps Supabase snake_case row to frontend Certificate model
 */
function mapRowToCertificate(row: any): Certificate {
  return {
    id: row.id,
    studentName: row.student_name,
    studentRegNo: row.student_reg_no,
    studentPublicAddress: row.student_public_address,
    certificateType: (row.certificate_type || 'Degree Certificate') as CertificateType,
    eventName: row.event_name || '',
    performanceLevel: (row.performance_level || 'Good') as PerformanceLevel,
    extraInfo: row.extra_info || '',
    imageDataUrl: row.image_data_url || '',
    issueDate: row.issue_date || new Date().toISOString().split('T')[0],
    solanaSignature: row.solana_signature,
    solanaMintAddress: row.solana_mint_address,
    slotNumber: Number(row.slot_number) || 0,
    solanaNetwork: row.solana_network || 'devnet',
    issuerAddress: row.issuer_address || '',
    certificateHash: row.certificate_hash || '',
  };
}

/**
 * Maps frontend Certificate model to Supabase table row
 */
function mapCertificateToRow(cert: Certificate): any {
  return {
    id: cert.id,
    student_name: cert.studentName,
    student_reg_no: cert.studentRegNo,
    student_public_address: cert.studentPublicAddress,
    certificate_type: cert.certificateType,
    event_name: cert.eventName || null,
    performance_level: cert.performanceLevel,
    extra_info: cert.extraInfo || null,
    image_data_url: cert.imageDataUrl || null,
    issue_date: cert.issueDate,
    solana_signature: cert.solanaSignature,
    solana_mint_address: cert.solanaMintAddress,
    slot_number: cert.slotNumber,
    solana_network: cert.solanaNetwork,
    issuer_address: cert.issuerAddress,
    certificate_hash: cert.certificateHash,
  };
}

/**
 * Fetches all issued certificates from the central Supabase PostgreSQL database
 */
export async function fetchCertificatesFromSupabase(): Promise<Certificate[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch certificates error:', error.message);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map(mapRowToCertificate);
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch from Supabase:', err);
    return [];
  }
}

/**
 * Saves a newly minted certificate to the central Supabase database
 */
export async function saveCertificateToSupabase(cert: Certificate): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const row = mapCertificateToRow(cert);
    const { error } = await supabase
      .from('certificates')
      .upsert([row], { onConflict: 'id' });

    if (error) {
      console.error('Supabase insert certificate error:', error.message);
      return false;
    }

    console.log('✅ Certificate saved to Central Supabase DB:', cert.id);
    return true;
  } catch (err) {
    console.error('Failed to save to Supabase:', err);
    return false;
  }
}

/**
 * Deletes all certificates from the central Supabase database
 */
export async function clearAllCertificatesInSupabase(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('certificates')
      .delete()
      .neq('id', '___non_existent___');

    if (error) {
      console.error('Supabase clear certificates error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to clear Supabase:', err);
    return false;
  }
}
