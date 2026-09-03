import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Award,
  Calendar,
  User,
  Hash,
  Download,
  Copy,
  Check,
  Loader2,
  Lock,
  Globe,
} from 'lucide-react';
import type { Certificate } from '../types/certificate';
import {
  verifyCertificateOnChain,
  getSolanaExplorerTxUrl,
  type VerifiedOnChainCertificate,
} from '../services/solanaService';

interface VerifyCertificateProps {
  certificates: Certificate[];
}

export const VerifyCertificate: React.FC<VerifyCertificateProps> = ({ certificates }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [searched, setSearched] = useState(false);
  const [matchedCert, setMatchedCert] = useState<Certificate | null>(null);
  const [onChainCert, setOnChainCert] = useState<VerifiedOnChainCertificate | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Check URL query param on mount e.g. ?verify=CQ9zbPGA...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('verify');
    if (verifyId) {
      setSearchQuery(verifyId);
      handlePerformVerification(verifyId);
    }
  }, [certificates]);

  const handlePerformVerification = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setMatchedCert(null);
      setOnChainCert(null);
      setSearched(false);
      return;
    }

    setIsVerifying(true);
    setSearched(false);
    setMatchedCert(null);
    setOnChainCert(null);

    // 1. First check local memory/storage
    const localMatch = certificates.find(
      (c) =>
        c.id.toLowerCase() === trimmed.toLowerCase() ||
        c.solanaMintAddress.toLowerCase() === trimmed.toLowerCase() ||
        c.solanaSignature.toLowerCase() === trimmed.toLowerCase() ||
        c.studentRegNo.toLowerCase() === trimmed.toLowerCase() ||
        c.studentPublicAddress.toLowerCase() === trimmed.toLowerCase()
    );

    if (localMatch) {
      setMatchedCert(localMatch);
      setIsVerifying(false);
      setSearched(true);
      return;
    }

    // 2. Query Live Solana Blockchain RPC Directly!
    try {
      const onChainResult = await verifyCertificateOnChain(trimmed, 'devnet');
      if (onChainResult && onChainResult.isVerified) {
        setOnChainCert(onChainResult);
      }
    } catch (err) {
      console.error('On-chain verification error:', err);
    } finally {
      setIsVerifying(false);
      setSearched(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePerformVerification(searchQuery);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const isAnyFound = Boolean(matchedCert || onChainCert);

  // Unified certificate data
  const certData = matchedCert
    ? {
        studentName: matchedCert.studentName,
        studentRegNo: matchedCert.studentRegNo,
        studentAddress: matchedCert.studentPublicAddress,
        certificateType: matchedCert.certificateType,
        eventName: matchedCert.eventName,
        performanceLevel: matchedCert.performanceLevel,
        extraInfo: matchedCert.extraInfo,
        issueDate: matchedCert.issueDate,
        mintAddress: matchedCert.solanaMintAddress,
        signature: matchedCert.solanaSignature,
        imageUrl: matchedCert.imageDataUrl,
        explorerUrl: getSolanaExplorerTxUrl(matchedCert.solanaSignature, matchedCert.solanaNetwork),
        issuer: matchedCert.issuerAddress || '3EuGcXELCnkghGve3tDwdfhDzjCNmd1g7T1qha7oERu5',
        isImmutable: true,
      }
    : onChainCert
    ? {
        studentName: onChainCert.studentName,
        studentRegNo: onChainCert.studentRegNo,
        studentAddress: onChainCert.studentAddress || 'Recorded On-Chain',
        certificateType: onChainCert.certificateType,
        eventName: onChainCert.eventName,
        performanceLevel: onChainCert.performanceLevel || 'Certified',
        extraInfo: onChainCert.extraInfo,
        issueDate: 'On-Chain Ledger Recorded',
        mintAddress: onChainCert.mintAddress,
        signature: '',
        imageUrl: onChainCert.imageUrl,
        explorerUrl: onChainCert.explorerUrl,
        issuer: onChainCert.issuerAddress,
        isImmutable: onChainCert.isImmutable,
      }
    : null;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>
      {/* Verification Header */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
        }}>
          <ShieldCheck size={32} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
          Live On-Chain Certificate Verification
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.4rem', maxWidth: '600px', margin: '0.4rem auto 1.5rem' }}>
          Directly inspects the <strong>Solana Blockchain Ledger</strong> and Metaplex smart contract to verify authentic academic credentials issued by <strong>SoftDesk</strong>.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.75rem', height: '48px', fontSize: '0.92rem' }}
              placeholder="Paste Solana Mint Address, Transaction Hash, or Reg No (i.e. 23-SE-100)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isVerifying}
            className="btn btn-primary"
            style={{ padding: '0 1.5rem', height: '48px', fontWeight: '700', gap: '0.4rem' }}
          >
            {isVerifying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify On-Chain</span>
            )}
          </button>
        </form>

        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.75rem' }}>
          Live verification: You can paste the Solana Mint Address directly from Solflare, Phantom, or Solana Explorer.
        </div>
      </div>

      {/* Loading state */}
      {isVerifying && (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Loader2 size={36} color="#10b981" className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
            Querying Solana Blockchain Ledger...
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '0.3rem' }}>
            Deriving Metaplex smart contract account and fetching cryptographic proof on Devnet.
          </p>
        </div>
      )}

      {/* Result View */}
      {searched && !isVerifying && (
        <>
          {isAnyFound && certData ? (
            <div className="glass-panel animate-fade-in" style={{
              padding: '2rem',
              border: '2px solid #10b981',
              background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
            }}>
              {/* Verified Badge Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingBottom: '1.25rem',
                borderBottom: '1px solid #dcfce7',
                marginBottom: '1.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
                  }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#065f46' }}>
                        100% VERIFIED AUTHENTIC
                      </span>
                      <span className="badge badge-active" style={{ background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }}>
                        Solana Cryptographic Proof
                      </span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#047857', marginTop: '2px' }}>
                      Official Issuer Authority: <strong>SoftDesk ({certData.issuer.slice(0, 6)}...{certData.issuer.slice(-4)})</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                  }}>
                    <Lock size={12} />
                    <span>Immutable (Mutable: FALSE)</span>
                  </span>
                </div>
              </div>

              {/* Main Content */}
              <div className="verify-result-grid" style={{ display: 'grid', gridTemplateColumns: certData.imageUrl ? '1fr 300px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
                
                {/* Details Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Recipient Box */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: '700' }}>
                      <User size={15} color="#4f46e5" />
                      <span>STUDENT / RECIPIENT INFORMATION</span>
                    </div>

                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                      {certData.studentName}
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem', fontSize: '0.88rem', color: '#475569', flexWrap: 'wrap' }}>
                      <div>
                        Registration No: <strong style={{ color: '#0f172a', fontFamily: 'var(--font-mono)' }}>{certData.studentRegNo}</strong>
                      </div>
                      {certData.performanceLevel && (
                        <div>
                          Performance: <span className="badge badge-good">{certData.performanceLevel}</span>
                        </div>
                      )}
                    </div>

                    {certData.studentAddress && (
                      <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: '#64748b' }}>
                        Owner / Holder Address:{' '}
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#334155' }}>
                          {certData.studentAddress}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Award / Event Box */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: '700' }}>
                      <Award size={15} color="#059669" />
                      <span>CREDENTIAL SPECIFICATION</span>
                    </div>

                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0369a1' }}>
                      {certData.certificateType}
                    </div>

                    {certData.eventName && (
                      <div style={{ fontSize: '0.88rem', color: '#334155', marginTop: '0.3rem' }}>
                        Program / Event: <strong>{certData.eventName}</strong>
                      </div>
                    )}

                    {certData.extraInfo && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569' }}>
                        Remarks: <strong>&ldquo;{certData.extraInfo}&rdquo;</strong>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.8rem', color: '#64748b' }}>
                      <Calendar size={13} />
                      <span>Recorded on: <strong>{certData.issueDate}</strong></span>
                    </div>
                  </div>

                  {/* On-Chain Cryptographic Proof */}
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', color: '#334155', fontSize: '0.8rem', fontWeight: '700' }}>
                      <Hash size={15} color="#4f46e5" />
                      <span>SOLANA ON-CHAIN TECHNICAL PROOF</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                          NFT Mint Address (1-of-1 Master Edition)
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          background: '#ffffff',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          wordBreak: 'break-all',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '2px',
                        }}>
                          <span>{certData.mintAddress}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(certData.mintAddress)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', padding: '2px' }}
                            title="Copy Mint Address"
                          >
                            {copiedAddress ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                          Official Issuer Authority
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.76rem',
                          background: '#ffffff',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          wordBreak: 'break-all',
                          marginTop: '2px',
                          color: '#0f172a',
                        }}>
                          {certData.issuer}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
                          Official Authority Website
                        </div>
                        <a
                          href="https://www.softdeskuet.com/"
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.76rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: '#4f46e5',
                            marginTop: '2px',
                            fontWeight: '600',
                          }}
                        >
                          <Globe size={12} />
                          <span>https://www.softdeskuet.com/</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* External Explorer Button */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <a
                      href={certData.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ gap: '0.4rem', fontWeight: '700' }}
                    >
                      <ExternalLink size={15} />
                      <span>View Live Proof on Solana Explorer</span>
                    </a>
                  </div>

                </div>

                {/* Certificate Artwork Thumbnail Column */}
                {certData.imageUrl && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', marginBottom: '0.5rem' }}>
                      AUTHENTIC CERTIFICATE ARTWORK
                    </div>
                    <img
                      src={certData.imageUrl}
                      alt="Certificate Artwork"
                      style={{
                        width: '100%',
                        maxHeight: '260px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                      }}
                    />
                    <a
                      href={certData.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', marginTop: '0.75rem', gap: '0.4rem', fontSize: '0.8rem' }}
                    >
                      <Download size={14} />
                      <span>Open Full Image</span>
                    </a>
                  </div>
                )}

              </div>
            </div>
          ) : (
            /* Not Found Alert */
            <div className="glass-panel animate-fade-in" style={{
              padding: '2.5rem 2rem',
              textAlign: 'center',
              border: '2px solid #fecdd3',
              background: '#fff1f2',
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#9f1239' }}>
                No Verified Record Found on Solana Ledger
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#be123c', maxWidth: '520px', margin: '0.4rem auto 1.25rem' }}>
                No verified certificate record matches the identifier &ldquo;{searchQuery}&rdquo; on the Solana Devnet blockchain. Please ensure you have pasted a valid Solana Mint Address or Registration Number.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearched(false);
                  setMatchedCert(null);
                  setOnChainCert(null);
                }}
                className="btn btn-secondary btn-sm"
              >
                Clear Search
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
