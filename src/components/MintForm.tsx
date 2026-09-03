import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  AlertCircle,
  FileCheck2,
  Lock,
  Wallet,
} from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import type { CertificateType, PerformanceLevel, MintFormData, WalletState } from '../types/certificate';
import { getAuthorizedAdminAddress } from '../services/walletService';

const CERTIFICATE_TYPES: CertificateType[] = [
  'Degree Certificate',
  'Merit Certificate',
  'Diploma of Excellence',
  'Course Completion',
  'Hackathon Winner',
  'Excellence Award',
  'Participation Certificate',
  'Professional Accreditation',
];

const PERFORMANCE_LEVELS: { id: PerformanceLevel; label: string; color: string }[] = [
  { id: 'Excellent', label: 'Excellent', color: '#059669' },
  { id: 'Good', label: 'Good', color: '#2563eb' },
  { id: 'Satisfactory', label: 'Satisfactory', color: '#d97706' },
  { id: 'Poor', label: 'Poor', color: '#64748b' },
];

interface MintFormProps {
  formData: MintFormData;
  onChange: (data: Partial<MintFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isMinting: boolean;
  wallet: WalletState;
  onConnectWallet: () => void;
}

export const MintForm: React.FC<MintFormProps> = ({
  formData,
  onChange,
  onSubmit,
  isMinting,
  wallet,
  onConnectWallet,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authorizedAdmin = getAuthorizedAdminAddress();
  const isAuthorized = wallet.isConnected && wallet.publicKey?.trim() === authorizedAdmin.trim();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange({ imageDataUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onChange({ imageDataUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!wallet.isConnected || !wallet.publicKey) {
      setErrorMessage('Please connect your Solana wallet first.');
      return;
    }

    if (!isAuthorized) {
      setErrorMessage(`Unauthorized Wallet: Connected wallet (${wallet.publicKey.slice(0, 6)}...${wallet.publicKey.slice(-4)}) is not the authorized admin wallet (${authorizedAdmin.slice(0, 6)}...${authorizedAdmin.slice(-4)}).`);
      return;
    }

    // 1. Mandatory Fields Check
    if (!formData.studentName.trim()) {
      setErrorMessage('Student Full Name is required.');
      return;
    }

    if (!formData.studentRegNo.trim()) {
      setErrorMessage('Student Registration Number is required.');
      return;
    }

    if (!formData.studentPublicAddress.trim()) {
      setErrorMessage('Student Solana Public Address is required.');
      return;
    }

    // 2. Strict Registration Number Format (e.g. 23-SE-30)
    const formattedRegNo = formData.studentRegNo.trim().toUpperCase();
    const REGNO_REGEX = /^\d{2}-[A-Z]{2,5}-\d{1,5}$/;
    if (!REGNO_REGEX.test(formattedRegNo)) {
      setErrorMessage('Invalid Registration Number format! Must follow academic format e.g. "23-SE-30" (Year-Department-RollNo).');
      return;
    }

    // 3. Strict Solana Wallet Address Pattern & Cryptographic Check
    const trimmedAddress = formData.studentPublicAddress.trim();
    const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!BASE58_REGEX.test(trimmedAddress)) {
      setErrorMessage('Invalid Solana Wallet Address: Address must be 32 to 44 Base58 characters (cannot contain 0, O, I, or l).');
      return;
    }

    try {
      const pubKey = new PublicKey(trimmedAddress);
      if (!PublicKey.isOnCurve(pubKey.toBuffer())) {
        setErrorMessage('Invalid Solana Wallet Address: The provided public key is not a valid on-curve user wallet account.');
        return;
      }
    } catch (err: any) {
      setErrorMessage('Invalid Solana Wallet Address: ' + (err.message || 'Please enter a valid Solana public key.'));
      return;
    }

    // Validated successfully
    onSubmit(e);
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', width: '100%' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
            Mint Certificate
          </h1>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1.1rem',
            background: '#fff1f2',
            border: '1.5px solid #f43f5e',
            borderRadius: '8px',
            color: '#be123c',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            fontSize: '0.88rem',
            fontWeight: '600',
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: '800', marginBottom: '2px' }}>Validation Error</div>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Wallet connection status notice if disconnected */}
        {!wallet.isConnected && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Wallet size={20} color="#4f46e5" />
              <span style={{ fontSize: '0.88rem', color: '#334155', fontWeight: '600' }}>
                Connect your authorized Solana wallet to mint certificates.
              </span>
            </div>
            <button
              type="button"
              onClick={onConnectWallet}
              className="btn btn-primary btn-sm"
            >
              Connect Wallet
            </button>
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Certificate Image Import Box */}
          <div className="form-group">
            <label className="form-label">
              <ImageIcon size={14} />
              <span>Import Certificate Image (Optional)</span>
            </label>
            
            {formData.imageDataUrl ? (
              <div style={{
                position: 'relative',
                width: '100%',
                maxHeight: '260px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src={formData.imageDataUrl}
                  alt="Imported Certificate"
                  style={{ maxHeight: '240px', maxWidth: '100%', objectFit: 'contain', padding: '0.5rem' }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Remove Image"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  padding: '1.75rem 1.5rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <Upload size={28} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0f172a' }}>
                  Click to Import / Upload Certificate Image
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Supports PNG, JPG, SVG, WebP (Max 5MB)
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          </div>

          {/* Student Name & Reg No */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="student-name">
                Student Full Name *
              </label>
              <input
                id="student-name"
                type="text"
                required
                className="form-input"
                value={formData.studentName}
                onChange={(e) => onChange({ studentName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="student-reg-no">
                  Registration No *
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                  Format: 23-SE-30
                </span>
              </div>
              <input
                id="student-reg-no"
                type="text"
                required
                className="form-input"
                value={formData.studentRegNo}
                onChange={(e) => onChange({ studentRegNo: e.target.value.toUpperCase() })}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}
              />
            </div>
          </div>

          {/* Student Solana Public Address */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="student-public-address">
                <Lock size={12} />
                <span>Student Solana Public Address (Wallet) *</span>
              </label>
              {wallet.publicKey && (
                <button
                  type="button"
                  onClick={() => onChange({ studentPublicAddress: wallet.publicKey! })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  + Use My Connected Address ({wallet.publicKey.slice(0, 4)}...{wallet.publicKey.slice(-4)})
                </button>
              )}
            </div>
            <input
              id="student-public-address"
              type="text"
              required
              className="form-input"
              value={formData.studentPublicAddress}
              onChange={(e) => onChange({ studentPublicAddress: e.target.value.trim() })}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}
            />
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.3rem' }}>
              Must be a valid Solana Base58 public address (32–44 characters).
            </div>
          </div>

          {/* Certificate Type & Event Name */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="certificate-type">
                Certificate Type *
              </label>
              <select
                id="certificate-type"
                className="form-select"
                value={formData.certificateType}
                onChange={(e) => onChange({ certificateType: e.target.value as CertificateType })}
              >
                {CERTIFICATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="event-name">
                Event / Program Name <span style={{ color: '#64748b', fontWeight: '400', textTransform: 'none' }}>(Optional)</span>
              </label>
              <input
                id="event-name"
                type="text"
                className="form-input"
                value={formData.eventName}
                onChange={(e) => onChange({ eventName: e.target.value })}
              />
            </div>
          </div>

          {/* Performance Level */}
          <div className="form-group">
            <label className="form-label">
              Performance Level *
            </label>
            <div className="performance-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {PERFORMANCE_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => onChange({ performanceLevel: level.id })}
                  style={{
                    padding: '0.55rem 0.5rem',
                    borderRadius: '8px',
                    border: formData.performanceLevel === level.id ? `2px solid ${level.color}` : '1px solid #cbd5e1',
                    background: formData.performanceLevel === level.id ? '#f8fafc' : '#ffffff',
                    color: formData.performanceLevel === level.id ? level.color : '#475569',
                    fontWeight: formData.performanceLevel === level.id ? '800' : '600',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Extra Information */}
          <div className="form-group">
            <label className="form-label" htmlFor="extra-info">
              Extra Information / Remarks <span style={{ color: '#64748b', fontWeight: '400', textTransform: 'none' }}>(Optional)</span>
            </label>
            <textarea
              id="extra-info"
              className="form-textarea"
              rows={2}
              value={formData.extraInfo}
              onChange={(e) => onChange({ extraInfo: e.target.value })}
            />
          </div>

          {/* Mint Button */}
          <div style={{ marginTop: '0.75rem' }}>
            <button
              type="submit"
              id="mint-certificate-submit-btn"
              disabled={isMinting}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', fontWeight: '800', gap: '0.5rem' }}
            >
              {isMinting ? (
                <span>Minting Certificate on Solana...</span>
              ) : (
                <>
                  <FileCheck2 size={20} />
                  <span>Mint Certificate</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
