/**
 * Uploads certificate image & metadata JSON to Bytebin (reliable, open, CORS-enabled).
 * Bytebin serves raw images with Content-Type: image/png and JSON with Content-Type: application/json.
 * Solflare, Phantom, and Solana Explorer can crawl this directly without any bot-blocks or CORS issues!
 */
export async function uploadCertificateMetadata(params: {
  name: string;
  symbol: string;
  studentName: string;
  studentRegNo: string;
  studentAddress?: string;
  certificateType: string;
  eventName?: string;
  performanceLevel?: string;
  extraInfo?: string;
  issuerAddress?: string;
  imageDataUrl?: string;
}): Promise<string> {
  const {
    name,
    symbol,
    studentName,
    studentRegNo,
    studentAddress,
    certificateType,
    eventName,
    performanceLevel,
    extraInfo,
    issuerAddress = '3EuGcXELCnkghGve3tDwdfhDzjCNmd1g7T1qha7oERu5',
    imageDataUrl,
  } = params;

  // Default fallback image if no custom image is provided
  let imageUrl = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

  // ============================================================
  // STEP 1: Upload certificate image (if user provided one)
  // ============================================================
  if (imageDataUrl && imageDataUrl.startsWith('data:image')) {
    try {
      // Convert data URL to Blob
      const fetchRes = await fetch(imageDataUrl);
      const blob = await fetchRes.blob();

      console.log('📤 Uploading certificate image to Bytebin CDN...', blob.size, 'bytes');

      const imgPostRes = await fetch('https://bytebin.lucko.me/post', {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'image/png',
        },
        body: blob,
      });

      if (imgPostRes.ok) {
        const data = await imgPostRes.json();
        if (data?.key) {
          imageUrl = `https://bytebin.lucko.me/${data.key}`;
          console.log('✅ Certificate Image uploaded to CDN:', imageUrl);
        }
      } else {
        console.warn('Image upload failed with status:', imgPostRes.status);
      }
    } catch (err) {
      console.warn('Error uploading image to Bytebin:', err);
    }
  }

  // ============================================================
  // STEP 2: Build Metaplex-standard JSON metadata object
  // ============================================================
  const remarksText = extraInfo && extraInfo.trim() ? ` Remarks: ${extraInfo.trim()}.` : '';

  const metadataObject = {
    name: name.slice(0, 32),
    symbol: symbol.slice(0, 10),
    description: `Official Blockchain Certificate issued by SoftDesk for ${studentName} (${studentRegNo}) — ${certificateType}.${remarksText} Verified on Solana Blockchain.`,
    image: imageUrl,
    external_url: 'https://www.softdeskuet.com/',
    attributes: [
      { trait_type: 'Issuer Authority', value: 'SoftDesk' },
      { trait_type: 'Student Name', value: studentName },
      { trait_type: 'Registration No', value: studentRegNo },
      { trait_type: 'Owner / Holder Address', value: studentAddress || studentRegNo },
      { trait_type: 'Certificate Type', value: certificateType },
      { trait_type: 'Event / Program', value: eventName || 'Academic Credential' },
      { trait_type: 'Performance Level', value: performanceLevel || 'Certified' },
      { trait_type: 'Remarks / Extra Notes', value: (extraInfo && extraInfo.trim()) ? extraInfo.trim() : 'Officially Certified' },
      { trait_type: 'Minted By', value: issuerAddress },
      { trait_type: 'Official Website', value: 'https://www.softdeskuet.com/' },
    ],
    properties: {
      files: [
        {
          uri: imageUrl,
          type: 'image/png',
        },
      ],
      category: 'image',
    },
  };

  // ============================================================
  // STEP 3: Upload Metadata JSON to Bytebin
  // ============================================================
  try {
    console.log('📤 Uploading Metaplex Metadata JSON to Bytebin...');
    const metaPostRes = await fetch('https://bytebin.lucko.me/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadataObject),
    });

    if (metaPostRes.ok) {
      const data = await metaPostRes.json();
      if (data?.key) {
        const metadataUrl = `https://bytebin.lucko.me/${data.key}`;
        console.log('✅ Metaplex Metadata JSON hosted at:', metadataUrl);
        return metadataUrl;
      }
    } else {
      console.warn('Metadata JSON upload failed with status:', metaPostRes.status);
    }
  } catch (err) {
    console.warn('Error uploading metadata JSON to Bytebin:', err);
  }

  // ============================================================
  // FALLBACK: Stable public Metaplex-compliant JSON
  // ============================================================
  console.warn('⚠️ Bytebin upload failed. Using fallback metadata.');
  return 'https://raw.githubusercontent.com/solana-developers/program-examples/main/tokens/token-2022/nft-meta.json';
}
