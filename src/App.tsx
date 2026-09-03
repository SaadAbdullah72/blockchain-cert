import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MintForm } from './components/MintForm';
import { IssuedCertificates } from './components/IssuedCertificates';
import { VerifyCertificate } from './components/VerifyCertificate';
import { MintSuccessModal } from './components/MintSuccessModal';
import { loadCertificates, saveCertificates } from './services/storageService';
import {
  fetchCertificatesFromSupabase,
  saveCertificateToSupabase,
  clearAllCertificatesInSupabase,
  isSupabaseConfigured,
} from './services/supabaseService';
import {
  connectSpecificWallet,
  disconnectSolanaWallet,
  fetchBalance,
  type WalletType,
} from './services/walletService';
import { mintCertificateOnSolana } from './services/solanaService';
import type { Certificate, MintFormData, WalletState } from './types/certificate';
import './styles/index.css';
import './styles/modals.css';

const DEFAULT_FORM: MintFormData = {
  studentName: '',
  studentRegNo: '',
  studentPublicAddress: '',
  certificateType: 'Degree Certificate',
  eventName: '',
  performanceLevel: 'Good',
  extraInfo: '',
  imageDataUrl: '',
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mint' | 'issued' | 'verify'>('mint');
  const [certificates, setCertificates] = useState<Certificate[]>(() => loadCertificates());
  const [formData, setFormData] = useState<MintFormData>(DEFAULT_FORM);
  const [isMinting, setIsMinting] = useState(false);
  const [justMintedCert, setJustMintedCert] = useState<Certificate | null>(null);

  // Real-time Wallet State
  const [wallet, setWallet] = useState<WalletState>({
    publicKey: null,
    balanceSol: 0,
    walletName: null,
    isConnected: false,
    isConnecting: false,
  });

  useEffect(() => {
    saveCertificates(certificates);
  }, [certificates]);

  // Initial Sync from Central Supabase Database
  useEffect(() => {
    if (isSupabaseConfigured()) {
      console.log('🔄 Fetching certificates from Central Supabase Database...');
      fetchCertificatesFromSupabase().then((dbCerts) => {
        if (dbCerts && dbCerts.length > 0) {
          console.log(`✅ Loaded ${dbCerts.length} certificates from Supabase`);
          setCertificates(dbCerts);
          saveCertificates(dbCerts);
        }
      });
    }
  }, []);

  const handleSelectWallet = async (type: WalletType) => {
    setWallet((prev) => ({ ...prev, isConnecting: true }));
    try {
      const w = await connectSpecificWallet(type);
      setWallet(w);
    } catch (err: any) {
      alert(err.message || 'Failed to connect wallet.');
      setWallet((prev) => ({ ...prev, isConnecting: false }));
    }
  };

  const handleDisconnectWallet = async () => {
    const w = await disconnectSolanaWallet();
    setWallet(w);
  };

  const handleFormChange = (updates: Partial<MintFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Direct Mint Trigger
  const handleMintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet.publicKey) {
      alert('Please connect your Solana wallet first.');
      return;
    }

    setIsMinting(true);
    try {
      const solanaResult = await mintCertificateOnSolana({
        formData,
        connectedWalletAddress: wallet.publicKey,
      });

      const newCert: Certificate = {
        id: solanaResult.id,
        studentName: formData.studentName.trim(),
        studentRegNo: formData.studentRegNo.trim().toUpperCase(),
        studentPublicAddress: formData.studentPublicAddress.trim(),
        certificateType: formData.certificateType,
        eventName: formData.eventName.trim() || undefined,
        performanceLevel: formData.performanceLevel,
        extraInfo: formData.extraInfo.trim() || undefined,
        imageDataUrl: formData.imageDataUrl || undefined,
        issueDate: new Date().toISOString().split('T')[0],
        solanaSignature: solanaResult.solanaSignature,
        solanaMintAddress: solanaResult.solanaMintAddress,
        slotNumber: solanaResult.slotNumber,
        solanaNetwork: solanaResult.solanaNetwork,
        issuerAddress: solanaResult.issuerAddress,
        certificateHash: solanaResult.certificateHash,
      };

      setCertificates((prev) => [newCert, ...prev]);

      // Save to Central Supabase DB
      if (isSupabaseConfigured()) {
        saveCertificateToSupabase(newCert).catch((err) => {
          console.warn('Could not sync newly minted cert to Supabase:', err);
        });
      }
      
      // Update balance
      if (wallet.publicKey) {
        fetchBalance(wallet.publicKey).then((bal) => {
          setWallet((w) => ({ ...w, balanceSol: bal }));
        });
      }

      // Reset form & Show Success Modal with copyable Mint Address & TX Signature
      setFormData(DEFAULT_FORM);
      setJustMintedCert(newCert);
    } catch (err: any) {
      console.error('Minting failed:', err);
      alert(err.message || 'Minting failed. Check console for details.');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wallet={wallet}
        onSelectWallet={handleSelectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        issuedCount={certificates.length}
      />

      <main className="main-content">
        {activeTab === 'mint' && (
          <MintForm
            formData={formData}
            onChange={handleFormChange}
            onSubmit={handleMintSubmit}
            isMinting={isMinting}
            wallet={wallet}
            onConnectWallet={() => {
              const btn = document.getElementById('btn-connect-wallet');
              if (btn) btn.click();
            }}
          />
        )}

        {activeTab === 'issued' && (
          <IssuedCertificates
            certificates={certificates}
            onVerify={(id) => {
              window.history.pushState({}, '', `?verify=${encodeURIComponent(id)}`);
              setActiveTab('verify');
            }}
            onClearAll={() => {
              if (isSupabaseConfigured()) {
                clearAllCertificatesInSupabase().catch((err) => {
                  console.warn('Could not clear Supabase:', err);
                });
              }
              setCertificates([]);
            }}
          />
        )}

        {activeTab === 'verify' && (
          <VerifyCertificate certificates={certificates} />
        )}
      </main>

      {/* Mint Success Popup with 1-Click Copy for Mint Address & TX Signature */}
      {justMintedCert && (
        <MintSuccessModal
          certificate={justMintedCert}
          onClose={() => setJustMintedCert(null)}
          onViewInIssued={() => {
            setJustMintedCert(null);
            setActiveTab('issued');
          }}
        />
      )}
    </div>
  );
};

export default App;
