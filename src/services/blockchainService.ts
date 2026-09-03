export const CONTRACT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
export const ISSUER_PUBLIC_KEY = '0x89205A3A3b2A5531C8456f04Ba970fFE84949C6b';

/**
 * Computes a standard SHA-256 hash string for certificate payload.
 */
export async function computeCertificateHash(data: {
  studentName: string;
  studentRegNo: string;
  certificateType: string;
  eventName: string;
  issueDate: string;
  organization: string;
}): Promise<string> {
  const canonicalString = JSON.stringify({
    studentName: data.studentName.trim(),
    studentRegNo: data.studentRegNo.trim().toUpperCase(),
    certificateType: data.certificateType.trim(),
    eventName: data.eventName.trim(),
    issueDate: data.issueDate,
    organization: data.organization.trim(),
  });

  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(canonicalString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback pseudo-hash if SubtleCrypto isn't available
    let hash = 0;
    for (let i = 0; i < canonicalString.length; i++) {
      hash = (hash << 5) - hash + canonicalString.charCodeAt(i);
      hash |= 0;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, 'a');
  }
}

/**
 * Simulates a cryptographic digital signature from the issuer's private key.
 */
export function generateDigitalSignature(certHash: string, issuerAddress: string): string {
  const salt = Math.random().toString(36).substring(2, 10);
  const raw = `${certHash}:${issuerAddress}:${salt}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `SIG_${Math.abs(hash).toString(16).toUpperCase()}_${certHash.slice(2, 10)}...${certHash.slice(-8)}`;
}

/**
 * Generates a random realistic Ethereum transaction hash.
 */
export function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Simulates IPFS CID generation.
 */
export function generateIpfsCid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let cid = 'bafybeic';
  for (let i = 0; i < 44; i++) {
    cid += chars[Math.floor(Math.random() * chars.length)];
  }
  return cid;
}

/**
 * Simulates on-chain minting delay and returns confirmed blockchain data.
 */
export async function mintToBlockchain(params: {
  certificateId: string;
  studentRegNo: string;
  studentName: string;
  certificateType: string;
  eventName: string;
  issueDate: string;
  organization: string;
  isOverride: boolean;
  issuerAddress: string;
}): Promise<{
  txHash: string;
  blockNumber: number;
  contractAddress: string;
  ipfsHash: string;
  certificateHash: string;
  digitalSignature: string;
  gasUsed: number;
}> {
  // Simulate network broadcast and consensus block time (1.2 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const certHash = await computeCertificateHash(params);
  const txHash = generateTxHash();
  const blockNumber = 19482000 + Math.floor(Math.random() * 5000);
  const ipfsHash = generateIpfsCid();
  const digitalSignature = generateDigitalSignature(certHash, params.issuerAddress);
  const gasUsed = 48290 + Math.floor(Math.random() * 5000);

  return {
    txHash,
    blockNumber,
    contractAddress: CONTRACT_ADDRESS,
    ipfsHash,
    certificateHash: certHash,
    digitalSignature,
    gasUsed,
  };
}
