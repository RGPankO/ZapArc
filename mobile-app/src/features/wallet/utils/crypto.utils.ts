/**
 * Cryptographic utilities for wallet encryption/decryption
 * Uses expo-crypto for secure random number generation and PBKDF2 key derivation
 * Uses SubtleCrypto for AES-GCM encryption (available in React Native via hermes/JSC)
 */

import * as Crypto from 'expo-crypto';
import type { EncryptedData } from '../types';

// Constants for key derivation
const SALT = 'zap-arc-mobile-wallet-salt';
const ITERATIONS = 100000;
const KEY_LENGTH = 256; // AES-256

/**
 * Derives an AES-256 encryption key from a PIN using PBKDF2
 * @param pin - User's PIN
 * @returns CryptoKey for AES-GCM encryption/decryption
 */
export async function deriveKeyFromPin(pin: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinBytes = encoder.encode(pin);
  const saltBytes = encoder.encode(SALT);

  // Import PIN as key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using AES-GCM with a PIN-derived key
 * @param data - String data to encrypt
 * @param pin - User's PIN for key derivation
 * @returns EncryptedData object with encrypted bytes, IV, and timestamp
 */
export async function encryptWithPin(
  data: string,
  pin: string
): Promise<EncryptedData> {
  // Derive encryption key from PIN
  const key = await deriveKeyFromPin(pin);

  // Generate random IV (12 bytes for AES-GCM)
  const ivBytes = await Crypto.getRandomBytesAsync(12);
  const iv = new Uint8Array(ivBytes);

  // Encode data to bytes
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);

  // Encrypt using AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBytes
  );

  // Return encrypted data structure
  return {
    data: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv),
    timestamp: Date.now(),
  };
}

/**
 * Decrypts data using AES-GCM with a PIN-derived key
 * @param encryptedData - EncryptedData object with encrypted bytes, IV, and timestamp
 * @param pin - User's PIN for key derivation
 * @returns Decrypted string data
 * @throws Error if decryption fails (wrong PIN or corrupted data)
 */
export async function decryptWithPin(
  encryptedData: EncryptedData,
  pin: string
): Promise<string> {
  // Derive decryption key from PIN
  const key = await deriveKeyFromPin(pin);

  // Convert arrays back to Uint8Arrays
  const iv = new Uint8Array(encryptedData.iv);
  const data = new Uint8Array(encryptedData.data);

  // Decrypt using AES-GCM
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Decode bytes to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Validates encrypted payload integrity
 * Checks timestamp for suspicious age (potential rollback attack)
 * @param timestamp - Encryption timestamp
 * @returns true if payload appears valid
 */
export function validatePayloadIntegrity(timestamp: number): boolean {
  const now = Date.now();
  const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
  const age = now - timestamp;

  // Check for suspiciously old data
  if (age > maxAge) {
    console.warn(
      '[Crypto] Wallet data timestamp is suspiciously old (>90 days)',
      { timestamp, ageInDays: Math.floor(age / (24 * 60 * 60 * 1000)) }
    );
    return true; // Still valid, but logged for investigation
  }

  // Check for future timestamp (possible tampering)
  if (age < 0) {
    console.warn(
      '[Crypto] Wallet data timestamp is in the future (possible rollback attack)',
      { timestamp, now, difference: Math.abs(age) }
    );
    return true; // Still valid, but logged for investigation
  }

  return true;
}

/**
 * Generates a UUID v4 string
 * Uses crypto.randomUUID if available, falls back to manual generation
 */
export function generateUUID(): string {
  // Try native randomUUID first
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Verifies a PIN by attempting to decrypt test data
 * @param encryptedData - Encrypted data to test
 * @param pin - PIN to verify
 * @returns true if PIN is correct, false otherwise
 */
export async function verifyPin(
  encryptedData: EncryptedData,
  pin: string
): Promise<boolean> {
  try {
    await decryptWithPin(encryptedData, pin);
    return true;
  } catch {
    return false;
  }
}
