import type { Certificate } from '../types/certificate';

const STORAGE_KEY_CERTS = 'softdesk_solana_certs_live_v1';

// Initial state is 100% clean and fresh - NO previous/mock certificates
const INITIAL_CERTIFICATES: Certificate[] = [];

export function loadCertificates(): Certificate[] {
  try {
    // Clear old legacy mock keys if they exist in browser
    try {
      localStorage.removeItem('trustcert_solana_clean_v4');
      localStorage.removeItem('trustcert_solana_clean_v3');
      localStorage.removeItem('trustcert_solana_clean_v2');
      localStorage.removeItem('trustcert_solana_certificates_v1');
    } catch {
      // ignore
    }

    const raw = localStorage.getItem(STORAGE_KEY_CERTS);
    if (!raw) {
      saveCertificates(INITIAL_CERTIFICATES);
      return INITIAL_CERTIFICATES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load certificates', err);
    return INITIAL_CERTIFICATES;
  }
}

export function saveCertificates(certs: Certificate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CERTS, JSON.stringify(certs));
  } catch (err) {
    console.error('Failed to save certificates', err);
  }
}

export function clearAllCertificates(): void {
  try {
    localStorage.setItem(STORAGE_KEY_CERTS, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to clear certificates', err);
  }
}
