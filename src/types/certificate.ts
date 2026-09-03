export type CertificateType =
  | 'Degree Certificate'
  | 'Merit Certificate'
  | 'Diploma of Excellence'
  | 'Course Completion'
  | 'Hackathon Winner'
  | 'Excellence Award'
  | 'Participation Certificate'
  | 'Professional Accreditation';

export type PerformanceLevel = 'Excellent' | 'Good' | 'Satisfactory' | 'Poor';

export interface Certificate {
  id: string; // e.g. "CERT-SOL-8801"
  studentName: string;
  studentRegNo: string;
  studentPublicAddress: string; // Solana base58 address
  certificateType: CertificateType;
  eventName?: string;
  performanceLevel: PerformanceLevel;
  extraInfo?: string;
  imageDataUrl?: string; // Uploaded certificate image (base64)
  issueDate: string;
  
  // Solana Blockchain Data
  solanaSignature: string;
  solanaMintAddress: string;
  slotNumber: number;
  solanaNetwork: 'devnet' | 'testnet' | 'mainnet-beta';
  issuerAddress: string;
  certificateHash: string;
}

export interface WalletState {
  publicKey: string | null;
  balanceSol: number;
  walletName: string | null;
  isConnected: boolean;
  isConnecting: boolean;
}

export interface MintFormData {
  studentName: string;
  studentRegNo: string;
  studentPublicAddress: string;
  certificateType: CertificateType;
  eventName: string;
  performanceLevel: PerformanceLevel;
  extraInfo: string;
  imageDataUrl: string;
}
