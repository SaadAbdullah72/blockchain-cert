import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { WalletState } from '../types/certificate';

export type WalletType = 'phantom' | 'solflare';

const DEFAULT_ADMIN_KEY = 'solana_app_admin_address_v2';
const CLUSTER_STORAGE_KEY = 'solana_app_cluster_choice';

export function getActiveRpcUrl(): string {
  try {
    const cluster = localStorage.getItem(CLUSTER_STORAGE_KEY);
    if (cluster === 'testnet') return 'https://api.testnet.solana.com';
  } catch {
    // ignore
  }
  return 'https://api.devnet.solana.com'; // Default to Devnet
}

interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toString(): string; toBase58(): string };
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string; toBase58(): string } }>;
  disconnect(): Promise<void>;
  signTransaction?(transaction: any): Promise<any>;
  signAllTransactions?(transactions: any[]): Promise<any[]>;
  signMessage?(message: Uint8Array): Promise<{ signature: Uint8Array }>;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
  }
}

/**
 * Gets Solflare provider from window
 */
export function getSolflareProvider(): SolanaProvider | null {
  if (typeof window === 'undefined') return null;
  if (window.solflare && window.solflare.isSolflare) {
    return window.solflare;
  }
  return null;
}

/**
 * Gets Phantom provider from window
 */
export function getPhantomProvider(): SolanaProvider | null {
  if (typeof window === 'undefined') return null;
  if (window.phantom?.solana?.isPhantom) {
    return window.phantom.solana;
  }
  if (window.solana?.isPhantom) {
    return window.solana;
  }
  return null;
}

export const OFFICIAL_SOFTDESK_MINTER = '3EuGcXELCnkghGve3tDwdfhDzjCNmd1g7T1qha7oERu5';

/**
 * Retrieves Authorized Admin Address (Strictly locked to SoftDesk official minter).
 */
export function getAuthorizedAdminAddress(): string {
  return OFFICIAL_SOFTDESK_MINTER;
}

export function setAuthorizedAdminAddress(address: string): void {
  try {
    localStorage.setItem(DEFAULT_ADMIN_KEY, address.trim());
  } catch {
    // ignore
  }
}

/**
 * Connects specifically to either Solflare or Phantom
 */
export async function connectSpecificWallet(walletType: WalletType): Promise<WalletState> {
  if (walletType === 'solflare') {
    const provider = getSolflareProvider();
    if (!provider) {
      throw new Error('Solflare extension not found! Please install Solflare from https://solflare.com or open your browser with Solflare enabled.');
    }

    try {
      const resp = await provider.connect();
      const pubKey = resp.publicKey ? resp.publicKey.toString() : provider.publicKey?.toString();
      if (!pubKey) {
        throw new Error('Could not get public key from Solflare.');
      }
      
      const balance = await fetchBalance(pubKey);

      // Auto-set as authorized admin if none set yet
      if (!getAuthorizedAdminAddress()) {
        setAuthorizedAdminAddress(pubKey);
      }

      return {
        publicKey: pubKey,
        balanceSol: balance,
        walletName: 'Solflare',
        isConnected: true,
        isConnecting: false,
      };
    } catch (err: any) {
      if (err.code === 4001 || err.message?.includes('rejected')) {
        throw new Error('Solflare connection request was rejected.');
      }
      throw new Error(err.message || 'Failed to connect to Solflare.');
    }
  }

  if (walletType === 'phantom') {
    const provider = getPhantomProvider();
    if (!provider) {
      throw new Error('Phantom extension not found! Please install Phantom from https://phantom.app or unlock your extension.');
    }

    try {
      const resp = await provider.connect();
      const pubKey = resp.publicKey ? resp.publicKey.toString() : provider.publicKey?.toString();
      if (!pubKey) {
        throw new Error('Could not get public key from Phantom.');
      }

      const balance = await fetchBalance(pubKey);

      // Auto-set as authorized admin if none set yet
      if (!getAuthorizedAdminAddress()) {
        setAuthorizedAdminAddress(pubKey);
      }

      return {
        publicKey: pubKey,
        balanceSol: balance,
        walletName: 'Phantom',
        isConnected: true,
        isConnecting: false,
      };
    } catch (err: any) {
      if (err.code === 4001 || err.message?.includes('rejected')) {
        throw new Error('Phantom connection request was rejected.');
      }
      throw new Error(err.message || 'Failed to connect to Phantom.');
    }
  }

  throw new Error('Unsupported wallet type.');
}

/**
 * Disconnects currently connected wallet
 */
export async function disconnectSolanaWallet(): Promise<WalletState> {
  const solflare = getSolflareProvider();
  if (solflare && solflare.disconnect) {
    try {
      await solflare.disconnect();
    } catch {
      // ignore
    }
  }

  const phantom = getPhantomProvider();
  if (phantom && phantom.disconnect) {
    try {
      await phantom.disconnect();
    } catch {
      // ignore
    }
  }

  return {
    publicKey: null,
    balanceSol: 0,
    walletName: null,
    isConnected: false,
    isConnecting: false,
  };
}

/**
 * Real SOL balance query from active cluster RPC
 */
export async function fetchBalance(pubkeyStr: string): Promise<number> {
  try {
    const connection = new Connection(getActiveRpcUrl(), 'confirmed');
    const pubkey = new PublicKey(pubkeyStr);
    const lamports = await connection.getBalance(pubkey);
    return lamports / LAMPORTS_PER_SOL;
  } catch (err) {
    console.warn('Live Solana balance query error:', err);
    return 0;
  }
}
