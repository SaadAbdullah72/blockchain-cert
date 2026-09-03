import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, ExternalLink, X, Award, ShieldCheck } from 'lucide-react';
import type { Certificate } from '../types/certificate';
import { getSolanaExplorerTxUrl } from '../services/solanaService';

interface MintSuccessModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  onViewInIssued: () => void;
}

export const MintSuccessModal: React.FC<MintSuccessModalProps> = ({
  certificate,
  onClose,
  onViewInIssued,
}) => {
  const [copiedMint, setCopiedMint] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  if (!certificate) return null;

  const explorerUrl = getSolanaExplorerTxUrl(certificate.solanaSignature, certificate.solanaNetwork);

  const handleCopyMint = () => {
    navigator.clipboard.writeText(certificate.solanaMintAddress);
    setCopiedMint(true);
    setTimeout(() => setCopiedMint(false), 2000);
  };

  const handleCopyTx = () => {
    navigator.clipboard.writeText(certificate.solanaSignature);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
      <div className="modal-container animate-modal" style={{ maxWidth: '560px', padding: '1.75rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                Certificate Minted On-Chain!
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '1px' }}>
                Recorded on Solana {certificate.solanaNetwork.toUpperCase()} blockchain ledger
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Certificate Recipient Summary */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
              {certificate.studentName}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Reg: {certificate.studentRegNo} • {certificate.certificateType}
            </div>
          </div>
          <span className="badge badge-active" style={{ fontSize: '0.74rem' }}>
            {certificate.id}
          </span>
        </div>

        {/* 1. NFT Mint Address Box with 1-Click Copy */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: '700', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Award size={13} color="#4f46e5" />
            <span>NFT MINT ADDRESS (Use this to import NFT in Wallet)</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
            gap: '0.5rem',
          }}>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#0f172a', wordBreak: 'break-all' }}>
              {certificate.solanaMintAddress}
            </code>
            <button
              type="button"
              onClick={handleCopyMint}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem', flexShrink: 0 }}
            >
              {copiedMint ? <Check size={13} color="#059669" /> : <Copy size={13} />}
              <span>{copiedMint ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* 2. Transaction Signature / Hash with 1-Click Copy */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: '700', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ShieldCheck size={13} color="#059669" />
            <span>TRANSACTION SIGNATURE / HASH</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
            gap: '0.5rem',
          }}>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: '#4f46e5', wordBreak: 'break-all' }}>
              {certificate.solanaSignature}
            </code>
            <button
              type="button"
              onClick={handleCopyTx}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem', flexShrink: 0 }}
            >
              {copiedTx ? <Check size={13} color="#059669" /> : <Copy size={13} />}
              <span>{copiedTx ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.82rem', gap: '0.4rem' }}
          >
            <ExternalLink size={14} />
            <span>View on Solana Explorer</span>
          </a>

          <button
            type="button"
            onClick={onViewInIssued}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.82rem', fontWeight: '700' }}
          >
            <span>View in Issued Certificates</span>
          </button>
        </div>

      </div>
    </div>
  );
};
