import React, { useState } from 'react';
import {
  ExternalLink,
  FileText,
  Search,
  Maximize2,
  X,
  Download,
  ShieldCheck,
} from 'lucide-react';
import type { Certificate, PerformanceLevel } from '../types/certificate';
import { getSolanaExplorerTxUrl } from '../services/solanaService';

interface IssuedCertificatesProps {
  certificates: Certificate[];
  onVerify?: (certId: string) => void;
  onClearAll?: () => void;
}

const getPerformanceBadge = (level: PerformanceLevel) => {
  switch (level) {
    case 'Excellent':
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    case 'Good':
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'Satisfactory':
      return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    case 'Poor':
      return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    default:
      return { bg: '#f8fafc', color: '#334155', border: '#e2e8f0' };
  }
};

export const IssuedCertificates: React.FC<IssuedCertificatesProps> = ({ certificates, onVerify, onClearAll }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const filtered = certificates.filter(
    (c) =>
      c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.studentRegNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.studentPublicAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.eventName && c.eventName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = (cert: Certificate) => {
    if (!cert.imageDataUrl) {
      alert('No custom image attached to this certificate.');
      return;
    }
    const link = document.createElement('a');
    link.href = cert.imageDataUrl;
    link.download = `${cert.studentName.replace(/\s+/g, '_')}_${cert.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header & Search */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
            Issued Certificates
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.86rem' }}>
            All minted student credentials on the Solana blockchain ledger ({certificates.length} total).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.85rem', minWidth: '280px' }}>
            <Search size={16} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', padding: '0.35rem 0', fontSize: '0.86rem' }}
            />
          </div>

          {certificates.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all issued certificates from the local list?')) {
                  onClearAll();
                }
              }}
              className="btn btn-secondary btn-sm"
              style={{ color: '#e11d48', borderColor: '#fecdd3', fontSize: '0.78rem' }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Grid of Minted Certificates */}
      {filtered.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
          gap: '1.25rem',
        }}>
          {filtered.map((cert) => {
            const badge = getPerformanceBadge(cert.performanceLevel);
            const explorerUrl = getSolanaExplorerTxUrl(cert.solanaSignature, cert.solanaNetwork);

            return (
              <div
                key={cert.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Certificate Image Banner */}
                {cert.imageDataUrl ? (
                  <div
                    onClick={() => setSelectedCert(cert)}
                    style={{
                      height: '180px',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <img
                      src={cert.imageDataUrl}
                      alt={cert.studentName}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      color: '#ffffff',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}>
                      <Maximize2 size={11} />
                      <span>View & Save</span>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    height: '80px',
                    background: 'linear-gradient(135deg, #eef2ff 0%, #ecfdf5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4f46e5' }}>
                      <FileText size={20} />
                      <span style={{ fontWeight: '800', fontSize: '0.88rem' }}>{cert.certificateType}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#64748b' }}>
                      {cert.id}
                    </span>
                  </div>
                )}

                {/* Certificate Details */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  
                  {/* Student Title & Reg */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                        {cert.studentName}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1px' }}>
                        Reg No: <strong style={{ color: '#0f172a' }}>{cert.studentRegNo}</strong>
                      </div>
                    </div>

                    {/* Performance Level Badge */}
                    <span style={{
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      fontSize: '0.74rem',
                      fontWeight: '800',
                    }}>
                      {cert.performanceLevel}
                    </span>
                  </div>

                  {/* Event & Type */}
                  <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Type: </span>
                      <strong style={{ color: '#0369a1' }}>{cert.certificateType}</strong>
                    </div>
                    {cert.eventName && (
                      <div>
                        <span style={{ color: '#64748b' }}>Event: </span>
                        <strong style={{ color: '#0f172a' }}>{cert.eventName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Student Public Address */}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                      Student Solana Address
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.76rem',
                      color: '#0f172a',
                      background: '#f1f5f9',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '4px',
                      wordBreak: 'break-all',
                      marginTop: '2px',
                    }}>
                      {cert.studentPublicAddress}
                    </div>
                  </div>

                  {/* NFT Mint Address (for importing in wallet) */}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#4f46e5', textTransform: 'uppercase', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>NFT Mint Address</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(cert.solanaMintAddress);
                          alert(`NFT Mint Address copied:\n${cert.solanaMintAddress}`);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#4f46e5',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Copy Mint Address
                      </button>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      color: '#0f172a',
                      background: '#eef2ff',
                      border: '1px solid #c7d2fe',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '4px',
                      wordBreak: 'break-all',
                      marginTop: '2px',
                    }}>
                      {cert.solanaMintAddress}
                    </div>
                  </div>

                  {/* Extra Notes if any */}
                  {cert.extraInfo && (
                    <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>
                      &ldquo;{cert.extraInfo}&rdquo;
                    </div>
                  )}

                  {/* Footer Solana Link & Download */}
                  <div style={{
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {cert.issueDate}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {cert.imageDataUrl && (
                        <button
                          onClick={() => handleDownload(cert)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.76rem', padding: '0.25rem 0.55rem' }}
                          title="Download Certificate Image"
                        >
                          <Download size={12} />
                          <span>Save</span>
                        </button>
                      )}

                      {onVerify && (
                        <button
                          onClick={() => onVerify(cert.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.76rem', padding: '0.25rem 0.55rem', color: '#059669', borderColor: '#a7f3d0' }}
                          title="Verify this certificate"
                        >
                          <ShieldCheck size={12} color="#059669" />
                          <span>Verify</span>
                        </button>
                      )}

                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.76rem', padding: '0.25rem 0.65rem' }}
                      >
                        <ExternalLink size={12} />
                        <span>Explorer</span>
                      </a>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <FileText size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
            No Certificates Found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            {searchTerm ? `No certificates match "${searchTerm}".` : 'Mint your first certificate from the Mint Certificate tab.'}
          </p>
        </div>
      )}

      {/* Full Image Modal with Save / Download Button */}
      {selectedCert && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-container animate-modal" style={{ maxWidth: '800px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: '800' }}>
                  {selectedCert.studentName} - {selectedCert.certificateType}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Reg: {selectedCert.studentRegNo}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {selectedCert.imageDataUrl && (
                  <button
                    onClick={() => handleDownload(selectedCert)}
                    className="btn btn-primary btn-sm"
                  >
                    <Download size={14} />
                    <span>Download Image</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedCert(null)}
                  className="btn btn-secondary btn-sm"
                >
                  <X size={16} />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {selectedCert.imageDataUrl && (
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                maxHeight: '65vh',
                overflow: 'hidden',
              }}>
                <img
                  src={selectedCert.imageDataUrl}
                  alt={selectedCert.studentName}
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
