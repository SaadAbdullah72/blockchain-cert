import React, { useState } from 'react';
import { Wallet, LogOut, Settings, Check, X, Globe, ShieldCheck } from 'lucide-react';
import type { WalletState } from '../types/certificate';
import {
  getAuthorizedAdminAddress,
  setAuthorizedAdminAddress,
  getSolflareProvider,
  getPhantomProvider,
  type WalletType,
} from '../services/walletService';
import {
  getSelectedCluster,
  setSelectedCluster,
  type SolanaCluster,
} from '../services/solanaService';

interface NavbarProps {
  activeTab: 'mint' | 'issued' | 'verify';
  setActiveTab: (tab: 'mint' | 'issued' | 'verify') => void;
  wallet: WalletState;
  onSelectWallet: (type: WalletType) => void;
  onDisconnectWallet: () => void;
  issuedCount: number;
  onClusterChange?: (cluster: SolanaCluster) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  wallet,
  onSelectWallet,
  onDisconnectWallet,
  issuedCount,
  onClusterChange,
}) => {
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminInput, setAdminInput] = useState(() => getAuthorizedAdminAddress());
  const [currentCluster, setCurrentCluster] = useState<SolanaCluster>(() => getSelectedCluster());
  const [adminSaved, setAdminSaved] = useState(false);

  const hasSolflare = typeof window !== 'undefined' && Boolean(getSolflareProvider());
  const hasPhantom = typeof window !== 'undefined' && Boolean(getPhantomProvider());

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInput.trim()) return;
    setAuthorizedAdminAddress(adminInput.trim());
    setAdminSaved(true);
    setTimeout(() => {
      setAdminSaved(false);
      setShowAdminModal(false);
    }, 1000);
  };

  const handleClusterSwitch = (newCluster: SolanaCluster) => {
    setCurrentCluster(newCluster);
    setSelectedCluster(newCluster);
    if (onClusterChange) onClusterChange(newCluster);
  };

  const handleWalletPick = (type: WalletType) => {
    setShowSelectModal(false);
    onSelectWallet(type);
  };

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    }}>
      <div className="app-header" style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        {/* Brand / Logo */}
        <div 
          className="nav-brand"
          onClick={() => setActiveTab('mint')} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <img
            src="/softdesk-logo.png"
            alt="SoftDesk Logo"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid #1e293b',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: '800',
              fontSize: '1.15rem',
              color: '#0f172a',
              lineHeight: '1.2',
            }}>
              SOFT DESK
            </span>
            <span style={{ fontSize: '0.72rem', color: '#f97316', fontWeight: '700', letterSpacing: '0.5px' }}>
              BLOCKCHAIN CREDENTIALS
            </span>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="nav-tabs" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: '#f1f5f9',
          padding: '0.25rem',
          borderRadius: '8px',
        }}>
          <button
            id="tab-mint-cert"
            onClick={() => setActiveTab('mint')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'mint' ? '#ffffff' : 'transparent',
              color: activeTab === 'mint' ? '#4f46e5' : '#475569',
              fontWeight: activeTab === 'mint' ? '700' : '600',
              boxShadow: activeTab === 'mint' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              border: 'none',
            }}
          >
            Mint Certificate
          </button>

          <button
            id="tab-issued-certs"
            onClick={() => setActiveTab('issued')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'issued' ? '#ffffff' : 'transparent',
              color: activeTab === 'issued' ? '#4f46e5' : '#475569',
              fontWeight: activeTab === 'issued' ? '700' : '600',
              boxShadow: activeTab === 'issued' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              border: 'none',
            }}
          >
            Issued Certificates ({issuedCount})
          </button>

          <button
            id="tab-verify-cert"
            onClick={() => setActiveTab('verify')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'verify' ? '#ffffff' : 'transparent',
              color: activeTab === 'verify' ? '#10b981' : '#475569',
              fontWeight: activeTab === 'verify' ? '700' : '600',
              boxShadow: activeTab === 'verify' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <ShieldCheck size={14} color={activeTab === 'verify' ? '#10b981' : '#64748b'} />
            <span>Verify Credential</span>
          </button>
        </nav>

        {/* Top Right: Network Selector + Wallet Connect / Disconnect */}
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          
          {/* Cluster Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.2rem 0.4rem' }}>
            <Globe size={13} color="#64748b" style={{ marginRight: '0.25rem' }} />
            <select
              value={currentCluster}
              onChange={(e) => handleClusterSwitch(e.target.value as SolanaCluster)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: currentCluster === 'devnet' ? '#059669' : '#d97706',
                cursor: 'pointer',
                outline: 'none',
                padding: '0.2rem',
              }}
              title="Ensure your Solflare/Phantom wallet extension is set to the same cluster!"
            >
              <option value="devnet">Devnet</option>
              <option value="testnet">Testnet</option>
            </select>
          </div>

          {wallet.isConnected && wallet.publicKey ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.82rem',
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                }} />
                <span style={{ fontWeight: '700', color: '#4f46e5' }}>
                  {wallet.walletName || 'Solana'}:
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: '#0f172a' }}>
                  {wallet.publicKey.slice(0, 4)}...{wallet.publicKey.slice(-4)}
                </span>
                <span style={{ color: '#059669', fontWeight: '700' }}>
                  ({wallet.balanceSol.toFixed(2)} SOL)
                </span>
              </div>

              <button
                id="btn-disconnect-wallet"
                onClick={onDisconnectWallet}
                className="btn btn-secondary btn-sm"
                title="Disconnect Wallet"
              >
                <LogOut size={14} />
                <span>Disconnect</span>
              </button>

              <button
                onClick={() => {
                  setAdminInput(getAuthorizedAdminAddress() || wallet.publicKey || '');
                  setShowAdminModal(true);
                }}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.45rem', borderRadius: '8px' }}
                title="Set Authorized Admin Address"
              >
                <Settings size={14} color="#64748b" />
              </button>
            </div>
          ) : (
            <button
              id="btn-connect-wallet"
              onClick={() => setShowSelectModal(true)}
              disabled={wallet.isConnecting}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: '700' }}
            >
              <Wallet size={15} />
              <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Select Wallet Modal (Solflare / Phantom) */}
      {showSelectModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-container animate-modal" style={{ maxWidth: '440px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                Connect Solana Wallet
              </h3>
              <button
                onClick={() => setShowSelectModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* Solflare Button */}
              <button
                onClick={() => handleWalletPick('solflare')}
                className="btn"
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f39000 0%, #fc5400 100%)',
                    color: '#ffffff',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                  }}>
                    S
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>Solflare Wallet</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {hasSolflare ? 'Extension detected' : 'Click to connect'}
                    </div>
                  </div>
                </div>
                <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>Connect</span>
              </button>

              {/* Phantom Button */}
              <button
                onClick={() => handleWalletPick('phantom')}
                className="btn"
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ab9ff2 0%, #4e44ce 100%)',
                    color: '#ffffff',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                  }}>
                    P
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>Phantom Wallet</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {hasPhantom ? 'Extension detected' : 'Click to connect'}
                    </div>
                  </div>
                </div>
                <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>Connect</span>
              </button>

            </div>

            <div style={{
              marginTop: '1.25rem',
              padding: '0.75rem',
              background: '#f1f5f9',
              borderRadius: '8px',
              fontSize: '0.76rem',
              color: '#475569',
              lineHeight: '1.4',
            }}>
              Don&apos;t have an extension? Install{' '}
              <a href="https://solflare.com" target="_blank" rel="noreferrer" style={{ color: '#ea580c', fontWeight: '700' }}>
                Solflare
              </a>{' '}
              or{' '}
              <a href="https://phantom.app" target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontWeight: '700' }}>
                Phantom
              </a>{' '}
              to connect your real Solana wallet.
            </div>
          </div>
        </div>
      )}

      {/* Admin Authorization Address Modal */}
      {showAdminModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="modal-container animate-modal" style={{ maxWidth: '520px', padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.4rem' }}>
              Authorized Admin Wallet Address
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '1rem', lineHeight: '1.4' }}>
              Only transactions signed by this authorized Solana wallet address will be allowed to mint certificates.
            </p>

            <form onSubmit={handleSaveAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-address-input">
                  Admin Public Address (Base58)
                </label>
                <input
                  id="admin-address-input"
                  type="text"
                  required
                  className="form-input"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  placeholder="Enter authorized Solana wallet address..."
                />
              </div>

              {wallet.publicKey && (
                <button
                  type="button"
                  onClick={() => setAdminInput(wallet.publicKey!)}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  + Set as currently connected wallet ({wallet.publicKey.slice(0, 6)}...{wallet.publicKey.slice(-4)})
                </button>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                >
                  {adminSaved ? (
                    <>
                      <Check size={14} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Authorized Admin</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
