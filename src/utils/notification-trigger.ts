/**
 * Notification Trigger Service for Web Extension
 * Sends push notifications to mobile devices via Firebase Cloud Function
 */

const BASE_URL = 'https://us-central1-investave-1337.cloudfunctions.net';
const NOTIFICATION_ENDPOINT = `${BASE_URL}/sendTransactionNotification`;

interface NotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface RecipientInfo {
  pubKey?: string;
  pushToken?: string;
}

/**
 * Triggers a push notification to the recipient after a successful payment
 * @param recipient - Object containing either pubKey (node ID) or direct pushToken
 * @param amountSats - Amount in satoshis that was sent
 */
export async function triggerPaymentNotification(
  recipient: RecipientInfo,
  amountSats: number
): Promise<NotificationResponse> {
  try {
    // Only attempt if we have recipient info
    if (!recipient.pubKey && !recipient.pushToken) {
      console.log('🔔 [Notification] No recipient info available, skipping notification');
      return { success: false, error: 'No recipient info' };
    }

    console.log('🔔 [Notification] Triggering push notification for payment:', {
      recipientPubKey: recipient.pubKey ? `${recipient.pubKey.substring(0, 16)}...` : undefined,
      amount: amountSats
    });

    const response = await fetch(NOTIFICATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientPubKey: recipient.pubKey,
        expoPushToken: recipient.pushToken,
        amount: amountSats,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Notification] HTTP Error ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `HTTP Error ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json() as NotificationResponse;
    
    if (result.success) {
      console.log('✅ [Notification] Push notification sent:', result.message);
    } else {
      console.warn('⚠️ [Notification] Failed to send push:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ [Notification] Error triggering notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extracts the destination public key from a BOLT11 invoice
 * @param invoice - BOLT11 invoice string
 * @returns The destination node public key or undefined
 */
export function extractDestinationFromInvoice(invoice: string): string | undefined {
  // BOLT11 invoices encode the destination node in the invoice
  // The SDK's parse function should be used for proper extraction
  // This is a placeholder - the actual extraction happens in the calling code
  // using the breezSDK.parse() method
  return undefined;
}

/**
 * Extracts the payee pubkey from parsed invoice data
 * @param parsedInvoice - The parsed invoice object from SDK
 * @returns The payee public key or undefined
 */
export function extractPubkeyFromParsedInvoice(parsedInvoice: any): string | undefined {
  if (!parsedInvoice) return undefined;
  
  // Log structure for debugging
  console.log('🔍 [Notification] Parsed invoice type:', parsedInvoice.type);
  console.log('🔍 [Notification] Parsed invoice keys:', Object.keys(parsedInvoice));
  
  // Try various possible field names based on SDK version
  // Web SDK might use different casing or structure
  const type = parsedInvoice.type?.toLowerCase() || '';
  
  if (type.includes('bolt11') || type.includes('invoice')) {
    // Try to find the inner invoice data
    const invoice = parsedInvoice.invoice || parsedInvoice.inner || parsedInvoice.data || parsedInvoice;
    
    console.log('🔍 [Notification] Invoice data keys:', Object.keys(invoice || {}));
    
    // Try multiple field name variations
    const pubkey = invoice?.payeePubkey || 
                   invoice?.payee_pubkey ||
                   invoice?.destination || 
                   invoice?.nodeId ||
                   invoice?.node_id ||
                   invoice?.recipientNodeId ||
                   parsedInvoice?.payeePubkey ||
                   parsedInvoice?.destination;
    
    if (pubkey) {
      console.log('✅ [Notification] Extracted pubkey:', pubkey.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ [Notification] Could not find pubkey in invoice');
    }
    
    return pubkey;
  }
  
  // For LNURL, the node ID might be in the callback domain or not available
  if (type.includes('lnurl') || type.includes('lightning')) {
    console.log('🔍 [Notification] LNURL payment - pubkey not available before payment');
    return undefined;
  }
  
  console.warn('⚠️ [Notification] Unknown invoice type:', parsedInvoice.type);
  return undefined;
}
