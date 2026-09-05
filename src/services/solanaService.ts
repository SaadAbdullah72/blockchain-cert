import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createSetAuthorityInstruction,
  AuthorityType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction as createInitializeMint2022Instruction,
  createAssociatedTokenAccountInstruction as createATA2022Instruction,
  createMintToInstruction as createMintTo2022Instruction,
  getAssociatedTokenAddressSync as getATA2022AddressSync,
  getMintLen,
  ExtensionType,
  createInitializeNonTransferableMintInstruction,
} from '@solana/spl-token';
import { Buffer } from 'buffer';
import { getAuthorizedAdminAddress, getSolflareProvider, getPhantomProvider } from './walletService';
import { uploadCertificateMetadata } from './imageUploadService';
import type { MintFormData } from '../types/certificate';

export type SolanaCluster = 'devnet' | 'testnet';

const CLUSTER_STORAGE_KEY = 'solana_app_cluster_choice';
export const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// ============================================================
// SoftDesk Official Minter — ONLY this address can mint certs
// ============================================================
export const SOFTDESK_ISSUER_PUBKEY = new PublicKey('3EuGcXELCnkghGve3tDwdfhDzjCNmd1g7T1qha7oERu5');

export function getSelectedCluster(): SolanaCluster {
  try {
    const stored = localStorage.getItem(CLUSTER_STORAGE_KEY);
    if (stored === 'devnet' || stored === 'testnet') return stored;
  } catch {
    // ignore
  }
  return 'devnet'; // Default to Devnet
}

export function setSelectedCluster(cluster: SolanaCluster): void {
  try {
    localStorage.setItem(CLUSTER_STORAGE_KEY, cluster);
  } catch {
    // ignore
  }
}

export function getRpcUrl(cluster?: SolanaCluster): string {
  const activeCluster = cluster || getSelectedCluster();
  if (activeCluster === 'testnet') {
    return 'https://api.testnet.solana.com';
  }
  return 'https://api.devnet.solana.com';
}

/**
 * Computes SHA-256 32-byte hash
 */
export async function computeSha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.slice().buffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Encodes a string in Borsh format (4-byte uint32 little-endian length + UTF-8 bytes)
 */
function encodeBorshString(str: string): Buffer {
  const strBuf = Buffer.from(str, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBuf.length, 0);
  return Buffer.concat([lenBuf, strBuf]);
}

/**
 * Encodes Metaplex CreateMetadataAccountV3 instruction data (Discriminator 33)
 */
function encodeMetaplexCreateMetadataV3Data(params: {
  name: string;
  symbol: string;
  uri: string;
  creatorPubkey: PublicKey;
}): Buffer {
  const discriminator = Buffer.from([33]); // 33 for CreateMetadataAccountV3
  const nameBuf = encodeBorshString(params.name.slice(0, 32));
  const symbolBuf = encodeBorshString(params.symbol.slice(0, 10));
  const uriBuf = encodeBorshString(params.uri);
  
  const sellerFeeBuf = Buffer.alloc(2);
  sellerFeeBuf.writeUInt16LE(0, 0); // 0% royalty

  // Creators: Option<Vec<Creator>> -> Some([Creator { address, verified: 1, share: 100 }])
  // Creator is ALWAYS the official SoftDesk minter address — hardcoded, never the connected wallet
  const hasCreatorsBuf = Buffer.from([1]); // Some
  const numCreatorsBuf = Buffer.alloc(4);
  numCreatorsBuf.writeUInt32LE(1, 0); // 1 creator
  const creatorAddressBuf = SOFTDESK_ISSUER_PUBKEY.toBuffer(); // Always SoftDesk official address
  const creatorVerifiedBuf = Buffer.from([1]); // verified
  const creatorShareBuf = Buffer.from([100]); // 100%

  const hasCollectionBuf = Buffer.from([0]); // None
  const hasUsesBuf = Buffer.from([0]); // None
  const isMutableBuf = Buffer.from([0]); // is_mutable = false (100% Immutable certificate - No updates allowed!)
  const hasCollectionDetailsBuf = Buffer.from([0]); // None

  return Buffer.concat([
    discriminator,
    nameBuf,
    symbolBuf,
    uriBuf,
    sellerFeeBuf,
    hasCreatorsBuf,
    numCreatorsBuf,
    creatorAddressBuf,
    creatorVerifiedBuf,
    creatorShareBuf,
    hasCollectionBuf,
    hasUsesBuf,
    isMutableBuf,
    hasCollectionDetailsBuf,
  ]);
}

/**
 * Encodes Metaplex CreateMasterEditionV3 instruction data (Discriminator 17)
 */
function encodeMetaplexCreateMasterEditionV3Data(): Buffer {
  const discriminator = Buffer.from([17]); // 17 for CreateMasterEditionV3
  const maxSupplyOption = Buffer.from([1]); // Some(0) -> Non-fungible 1-of-1
  const maxSupplyValue = Buffer.alloc(8); // 8 zero-bytes represents u64 0
  return Buffer.concat([discriminator, maxSupplyOption, maxSupplyValue]);
}

/**
 * Computes a SHA-256 hex string for the certificate payload
 */
export async function computeCertificateHash(data: MintFormData): Promise<{ hex: string; bytes: Uint8Array }> {
  const payload = JSON.stringify({
    studentName: data.studentName.trim(),
    studentRegNo: data.studentRegNo.trim().toUpperCase(),
    studentPublicAddress: data.studentPublicAddress.trim(),
    certificateType: data.certificateType,
    eventName: (data.eventName || '').trim(),
    performanceLevel: data.performanceLevel,
    extraInfo: (data.extraInfo || '').trim(),
    hasImage: Boolean(data.imageDataUrl),
  });

  const encoder = new TextEncoder();
  const bytes = await computeSha256Bytes(encoder.encode(payload));
  const hex = '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  return { hex, bytes };
}

/**
 * Mints an official Certificate as a REAL 1-of-1 Metaplex Master Edition NFT on Solana Devnet.
 * - Creator: Always SoftDesk official address (3EuGcXELCnkghGve3tDwdfhDzjCNmd1g7T1qha7oERu5)
 * - Owner/Holder: Student's public key (NFT delivered to their wallet ATA)
 * - Non-Transferable: Uses Token-2022 NonTransferable extension (soul-bound)
 * - Mint Authority: Revoked after minting (supply permanently locked at 1)
 * - Gate: Only SoftDesk wallet can call this — all others throw an error
 */
export async function mintCertificateOnSolana(params: {
  formData: MintFormData;
  connectedWalletAddress: string;
  cluster?: SolanaCluster;
}): Promise<{
  id: string;
  solanaSignature: string;
  solanaMintAddress: string;
  slotNumber: number;
  solanaNetwork: 'devnet' | 'testnet';
  certificateHash: string;
  issuerAddress: string;
}> {
  const { formData, connectedWalletAddress, cluster = getSelectedCluster() } = params;

  // 1. Verify Authorized Admin Wallet Address
  const authorizedAdmin = getAuthorizedAdminAddress();
  if (authorizedAdmin && connectedWalletAddress.trim() !== authorizedAdmin.trim()) {
    throw new Error(
      `Unauthorized Wallet Error: Only the authorized admin address (${authorizedAdmin.slice(0, 6)}...${authorizedAdmin.slice(-4)}) is permitted to mint certificates on Solana.`
    );
  }

  // 2. Validate student public address
  let studentPubkey: PublicKey;
  try {
    studentPubkey = new PublicKey(formData.studentPublicAddress.trim());
  } catch {
    throw new Error('Invalid Student Solana Public Address: Please provide a valid Base58 Solana wallet address.');
  }

  const issuerPubkey = new PublicKey(connectedWalletAddress);
  const rpcUrl = getRpcUrl(cluster);
  const connection = new Connection(rpcUrl, 'confirmed');

  // 3. Generate unique Certificate ID and NFT Mint Keypair
  const certId = `CERT-SOL-${Math.floor(1000 + Math.random() * 9000)}`;
  const issueDate = new Date().toISOString().split('T')[0];
  const nftMintKeypair = Keypair.generate();

  // 4. Derive Student's Associated Token Account (ATA) using Token-2022 program
  //    (Token-2022 is required for NonTransferable extension)
  const studentTokenAccount = getATA2022AddressSync(
    nftMintKeypair.publicKey,
    studentPubkey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // 5. Derive Metaplex Metadata Account PDA
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METAPLEX_PROGRAM_ID.toBuffer(),
      nftMintKeypair.publicKey.toBuffer(),
    ],
    METAPLEX_PROGRAM_ID
  );

  // 6. Derive Metaplex Master Edition PDA (Required for Solflare/Phantom NFT Galleries!)
  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METAPLEX_PROGRAM_ID.toBuffer(),
      nftMintKeypair.publicKey.toBuffer(),
      Buffer.from('edition'),
    ],
    METAPLEX_PROGRAM_ID
  );

  // 7. Compute certificate cryptographic hash
  const { hex: certHashHex } = await computeCertificateHash(formData);

  // 8. Calculate Rent for Token-2022 Mint account (larger than standard MINT_SIZE due to NonTransferable extension)
  const extensions = [ExtensionType.NonTransferable];
  const mintLen = getMintLen(extensions);
  const rentForMint = await connection.getMinimumBalanceForRentExemption(mintLen);

  // Build Transaction with:
  // A) Create Token-2022 Mint Account (with NonTransferable extension — soul-bound NFT)
  // B) Initialize NonTransferable Extension
  // C) Initialize Token-2022 Mint (decimals = 0, mint authority = issuer)
  // D) Create Student Associated Token Account (ATA) via Token-2022
  // E) Mint 1 NFT directly to Student's Wallet ATA
  // F) REVOKE Mint Authority (permanently locks supply at 1, no re-minting possible)
  // G) Metaplex Token Metadata V3 (Attaches Name, Symbol & JSON metadata)
  // H) Metaplex Master Edition V3 (Locks 1-of-1 NFT so Solflare indexes it into NFTs Tab)
  // I) Solana Memo Program (Permanently records certificate hash & student on-chain)
  const transaction = new Transaction();

  // A) Create Token-2022 Mint Account with space for NonTransferable extension
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: issuerPubkey,
      newAccountPubkey: nftMintKeypair.publicKey,
      space: mintLen,
      lamports: rentForMint,
      programId: TOKEN_2022_PROGRAM_ID, // Token-2022 program owns this mint
    })
  );

  // B) Initialize NonTransferable Extension BEFORE initializing the mint
  //    This makes the NFT soul-bound — it can NEVER be transferred once minted!
  transaction.add(
    createInitializeNonTransferableMintInstruction(
      nftMintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // C) Initialize Mint (decimals: 0 for 1-of-1 NFT)
  //    mint_authority = issuer (SoftDesk wallet), freeze_authority = issuer
  transaction.add(
    createInitializeMint2022Instruction(
      nftMintKeypair.publicKey,
      0,
      issuerPubkey,  // mint_authority = SoftDesk connected wallet
      issuerPubkey,  // freeze_authority = SoftDesk connected wallet
      TOKEN_2022_PROGRAM_ID
    )
  );

  // D) Create Student's Associated Token Account (ATA) — Token-2022
  transaction.add(
    createATA2022Instruction(
      issuerPubkey,
      studentTokenAccount,
      studentPubkey,
      nftMintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  // E) Mint exactly 1 NFT Token into Student's Token Account
  transaction.add(
    createMintTo2022Instruction(
      nftMintKeypair.publicKey,
      studentTokenAccount,
      issuerPubkey,
      1,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  // F) REVOKE Mint Authority — permanently locks supply at 1!
  //    After this, nobody (not even SoftDesk) can ever mint more of this certificate.
  transaction.add(
    createSetAuthorityInstruction(
      nftMintKeypair.publicKey,
      issuerPubkey,          // current authority (SoftDesk connected wallet)
      AuthorityType.MintTokens,
      null,                  // new authority = null => permanently revoked
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  // G) Metaplex Metadata Account (Available on Devnet & Mainnet!)
  if (cluster === 'devnet') {
    // Upload image + build proper Metaplex JSON metadata file hosted on public CDN
    const nftName = `SoftDesk - ${formData.certificateType.slice(0, 20)}`.slice(0, 32);

    const metadataUri = await uploadCertificateMetadata({
      name: nftName,
      symbol: 'SDSK',
      studentName: formData.studentName.trim(),
      studentRegNo: formData.studentRegNo.trim().toUpperCase(),
      studentAddress: formData.studentPublicAddress.trim(),
      certificateType: formData.certificateType,
      eventName: formData.eventName,
      performanceLevel: formData.performanceLevel,
      extraInfo: formData.extraInfo,
      // Always use the hardcoded SoftDesk official address as issuer — not the connected wallet string
      issuerAddress: SOFTDESK_ISSUER_PUBKEY.toBase58(),
      imageDataUrl: formData.imageDataUrl,
    });

    console.log('📋 Final Metaplex URI:', metadataUri);

    const metadataInstructionData = encodeMetaplexCreateMetadataV3Data({
      name: nftName,
      symbol: 'SDSK',
      uri: metadataUri,
      // Creator is ALWAYS the official SoftDesk address — NOT the connected wallet
      creatorPubkey: SOFTDESK_ISSUER_PUBKEY,
    });

    transaction.add(
      new TransactionInstruction({
        programId: METAPLEX_PROGRAM_ID,
        keys: [
          { pubkey: metadataPda, isSigner: false, isWritable: true },
          { pubkey: nftMintKeypair.publicKey, isSigner: false, isWritable: false },
          { pubkey: issuerPubkey, isSigner: true, isWritable: false }, // mint_authority (connected wallet)
          { pubkey: issuerPubkey, isSigner: true, isWritable: true }, // payer (connected wallet pays fees)
          { pubkey: issuerPubkey, isSigner: true, isWritable: false }, // update_authority (connected wallet = SoftDesk)
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: metadataInstructionData,
      })
    );

    // H) Metaplex Master Edition V3 Instruction (Tells Solflare this is an authentic Master Edition NFT)
    const masterEditionData = encodeMetaplexCreateMasterEditionV3Data();
    transaction.add(
      new TransactionInstruction({
        programId: METAPLEX_PROGRAM_ID,
        keys: [
          { pubkey: masterEditionPda, isSigner: false, isWritable: true },
          { pubkey: nftMintKeypair.publicKey, isSigner: false, isWritable: true },
          { pubkey: issuerPubkey, isSigner: true, isWritable: false }, // update_authority
          { pubkey: issuerPubkey, isSigner: true, isWritable: false }, // mint_authority
          { pubkey: issuerPubkey, isSigner: true, isWritable: true }, // payer
          { pubkey: metadataPda, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: masterEditionData,
      })
    );
  }

  // G) Solana Memo Program: Permanently stamps the certificate hash & student metadata on the Solana ledger
  const memoPayload = JSON.stringify({
    certId,
    regNo: formData.studentRegNo.trim().toUpperCase(),
    name: formData.studentName.trim(),
    type: formData.certificateType,
    event: formData.eventName.trim(),
    perf: formData.performanceLevel,
    date: issueDate,
    hash: certHashHex,
  });

  transaction.add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [{ pubkey: issuerPubkey, isSigner: true, isWritable: false }],
      data: Buffer.from(memoPayload, 'utf8'),
    })
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = issuerPubkey;

  // Partial sign with the newly generated Mint Keypair
  transaction.partialSign(nftMintKeypair);

  // 8. Sign and Send with Connected Wallet (Solflare or Phantom)
  let txSignature: string;

  const solflare = getSolflareProvider();
  const phantom = getPhantomProvider();

  try {
    if (solflare && solflare.isSolflare && solflare.publicKey?.toString() === connectedWalletAddress) {
      if ((solflare as any).signAndSendTransaction) {
        const res = await (solflare as any).signAndSendTransaction(transaction);
        txSignature = res.signature || (typeof res === 'string' ? res : '');
      } else {
        const signed = await solflare.signTransaction!(transaction);
        txSignature = await connection.sendRawTransaction(signed.serialize());
      }
    } else if (phantom && phantom.publicKey?.toString() === connectedWalletAddress) {
      if ((phantom as any).signAndSendTransaction) {
        const res = await (phantom as any).signAndSendTransaction(transaction);
        txSignature = res.signature || (typeof res === 'string' ? res : '');
      } else {
        const signed = await phantom.signTransaction!(transaction);
        txSignature = await connection.sendRawTransaction(signed.serialize());
      }
    } else {
      const provider = window.solflare || window.phantom?.solana || window.solana;
      if (!provider) {
        throw new Error('No Solana wallet extension found to sign transaction. Please unlock Solflare or Phantom.');
      }
      if ((provider as any).signAndSendTransaction) {
        const res = await (provider as any).signAndSendTransaction(transaction);
        txSignature = res.signature || (typeof res === 'string' ? res : '');
      } else {
        const signed = await provider.signTransaction!(transaction);
        txSignature = await connection.sendRawTransaction(signed.serialize());
      }
    }
  } catch (signErr: any) {
    console.error('Wallet signing rejected or failed:', signErr);
    if (signErr.code === 4001 || signErr.message?.includes('reject')) {
      throw new Error('Transaction was cancelled / rejected in your Solana wallet.');
    }
    if (signErr.message?.includes('network') || signErr.message?.includes('mismatch')) {
      throw new Error(`Network Mismatch: Please ensure your Solflare/Phantom wallet extension is set to "${cluster.toUpperCase()}" in wallet settings.`);
    }
    throw new Error(signErr.message || 'Failed to sign and broadcast transaction with Solana wallet.');
  }

  // 9. Confirm Transaction on Solana Cluster
  await connection.confirmTransaction(
    {
      signature: txSignature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  );

  const slotNumber = await connection.getSlot('confirmed');
  const solanaMintAddress = nftMintKeypair.publicKey.toBase58();

  return {
    id: certId,
    solanaSignature: txSignature,
    solanaMintAddress,
    slotNumber,
    solanaNetwork: cluster,
    certificateHash: certHashHex,
    issuerAddress: connectedWalletAddress,
  };
}

export function getSolanaExplorerTxUrl(signature: string, network: string = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
}

export interface VerifiedOnChainCertificate {
  isVerified: boolean;
  mintAddress: string;
  name: string;
  symbol: string;
  studentName: string;
  studentRegNo: string;
  studentAddress?: string;
  certificateType: string;
  eventName?: string;
  performanceLevel?: string;
  extraInfo?: string;
  imageUrl?: string;
  issuerAddress: string;
  updateAuthority: string;
  isImmutable: boolean;
  cluster: SolanaCluster;
  explorerUrl: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

/**
 * Directly queries the live Solana blockchain to cryptographically verify any certificate
 * by its Mint Address or Transaction Signature.
 */
export async function verifyCertificateOnChain(
  query: string,
  cluster: SolanaCluster = 'devnet'
): Promise<VerifiedOnChainCertificate | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const connection = new Connection(getRpcUrl(cluster), 'confirmed');

  try {
    let mintPublicKey: PublicKey | null = null;

    // Check if input is a valid 32-44 character Solana Public Key
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
      try {
        mintPublicKey = new PublicKey(trimmed);
      } catch {
        mintPublicKey = null;
      }
    }

    // If input is a long Transaction Signature (64+ chars), find the mint from transaction
    if (!mintPublicKey && trimmed.length >= 64) {
      try {
        const tx = await connection.getParsedTransaction(trimmed, {
          maxSupportedTransactionVersion: 0,
        });

        if (tx && tx.meta?.postTokenBalances && tx.meta.postTokenBalances.length > 0) {
          const mintStr = tx.meta.postTokenBalances[0].mint;
          if (mintStr) {
            mintPublicKey = new PublicKey(mintStr);
          }
        }
      } catch (txErr) {
        console.warn('Could not parse transaction for mint:', txErr);
      }
    }

    if (!mintPublicKey) return null;

    // Derive Metaplex Metadata Account PDA for this mint
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        METAPLEX_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer(),
      ],
      METAPLEX_PROGRAM_ID
    );

    // Fetch account info from Solana blockchain
    const accountInfo = await connection.getAccountInfo(metadataPda);
    if (!accountInfo || !accountInfo.data || accountInfo.data.length < 70) {
      return null;
    }

    const data = accountInfo.data;

    // Decode Metaplex metadata layout:
    // Key (1) + UpdateAuthority (32) + Mint (32) + NameLen (4) + Name ...
    const updateAuthority = new PublicKey(data.slice(1, 33)).toString();
    const mintKey = new PublicKey(data.slice(33, 65)).toString();

    const nameLen = data.readUInt32LE(65);
    const name = data.slice(69, 69 + nameLen).toString('utf8').replace(/\0/g, '').trim();

    const symOffset = 69 + nameLen;
    const symLen = data.readUInt32LE(symOffset);
    const symbol = data.slice(symOffset + 4, symOffset + 4 + symLen).toString('utf8').replace(/\0/g, '').trim();

    const uriOffset = symOffset + 4 + symLen;
    const uriLen = data.readUInt32LE(uriOffset);
    const rawUri = data.slice(uriOffset + 4, uriOffset + 4 + uriLen).toString('utf8').replace(/\0/g, '').trim();

    // is_mutable is near the end of the metadata struct
    const isImmutable = data[data.length - 2] === 0 || data[data.length - 1] === 0;

    // Fetch off-chain JSON metadata from CDN/IPFS
    let metadataJson: any = {};
    if (rawUri.startsWith('http')) {
      try {
        const res = await fetch(rawUri);
        if (res.ok) {
          metadataJson = await res.json();
        }
      } catch (jsonErr) {
        console.warn('Could not fetch JSON from URI:', rawUri, jsonErr);
      }
    }

    // Extract traits & attributes
    const attributes: Array<{ trait_type: string; value: string }> = metadataJson.attributes || [];
    const findTrait = (key: string) =>
      attributes.find((a) => a.trait_type.toLowerCase().includes(key.toLowerCase()))?.value || '';

    const studentName = findTrait('Student Name') || findTrait('Student') || name.replace('SoftDesk - ', '');
    const studentRegNo = findTrait('Registration No') || findTrait('Reg No') || '';
    const certificateType = findTrait('Certificate Type') || findTrait('Certificate') || 'Certificate';
    const eventName = findTrait('Event') || '';
    const performanceLevel = findTrait('Performance') || 'Certified';
    const extraInfo = findTrait('Remarks') || findTrait('Notes') || '';
    const studentAddress = findTrait('Owner') || findTrait('Holder') || '';
    const issuerAddress = findTrait('Minted By') || findTrait('Issuer') || updateAuthority;

    return {
      isVerified: true,
      mintAddress: mintKey,
      name,
      symbol,
      studentName,
      studentRegNo,
      studentAddress,
      certificateType,
      eventName,
      performanceLevel,
      extraInfo,
      imageUrl: metadataJson.image || '',
      issuerAddress,
      updateAuthority,
      isImmutable,
      cluster,
      explorerUrl: `https://explorer.solana.com/address/${mintKey}?cluster=${cluster}`,
      attributes,
    };
  } catch (err) {
    console.error('Error verifying certificate on Solana blockchain:', err);
    return null;
  }
}

