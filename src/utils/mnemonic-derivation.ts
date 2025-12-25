/**
 * Mnemonic Derivation Utilities for Sub-Wallet Creation
 *
 * Since Breez SDK doesn't support HD path derivation, we create sub-wallets
 * by modifying the mnemonic's 11th word and recalculating the 12th word (checksum).
 *
 * Sub-Wallet Derivation Strategy:
 * - Sub-Wallet 0: Uses the original 12-word mnemonic unchanged
 * - Sub-Wallet N: Increment the 11th word by N positions in BIP-39 wordlist,
 *                 then recalculate the 12th word (checksum)
 */

import * as bip39 from 'bip39';
import { HIERARCHICAL_WALLET_CONSTANTS } from '../types';

const { MAX_SUB_WALLETS, BIP39_WORDLIST_SIZE } = HIERARCHICAL_WALLET_CONSTANTS;

// BIP-39 English wordlist
const WORDLIST = bip39.wordlists.english;

/**
 * Validates that a sub-wallet index is within bounds
 * @param index - Sub-wallet index to validate
 * @returns true if index is 0-19 (MAX_SUB_WALLETS - 1)
 */
export function isValidSubWalletIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < MAX_SUB_WALLETS;
}

/**
 * Gets the index of a word in the BIP-39 wordlist
 * @param word - Word to find
 * @returns Index (0-2047) or -1 if not found
 */
export function getWordIndex(word: string): number {
  return WORDLIST.indexOf(word.toLowerCase().trim());
}

/**
 * Gets the word at a specific index in the BIP-39 wordlist
 * @param index - Index (0-2047)
 * @returns Word at that index
 * @throws Error if index is out of bounds
 */
export function getWordAtIndex(index: number): string {
  if (index < 0 || index >= BIP39_WORDLIST_SIZE) {
    throw new Error(`Word index ${index} out of bounds (0-${BIP39_WORDLIST_SIZE - 1})`);
  }
  return WORDLIST[index];
}

/**
 * Increments a word's position in the BIP-39 wordlist by an offset
 * Wraps around if the result exceeds 2047
 *
 * @param currentWord - Current word from the wordlist
 * @param offset - How many positions to increment (0-19)
 * @returns New word from BIP-39 wordlist
 * @throws Error if currentWord is not in the wordlist
 */
export function incrementWord(currentWord: string, offset: number): string {
  const currentIndex = getWordIndex(currentWord);
  if (currentIndex === -1) {
    throw new Error(`Word "${currentWord}" is not in the BIP-39 wordlist`);
  }

  // Wrap around using modulo
  const newIndex = (currentIndex + offset) % BIP39_WORDLIST_SIZE;
  return getWordAtIndex(newIndex);
}

/**
 * Converts 11 words to their entropy bits (for checksum calculation)
 * Each word represents 11 bits of entropy
 *
 * @param words - Array of 11 words
 * @returns Uint8Array of entropy bytes
 */
function wordsToEntropy(words: string[]): Uint8Array {
  if (words.length !== 11) {
    throw new Error(`Expected 11 words, got ${words.length}`);
  }

  // 11 words × 11 bits = 121 bits
  // For 12-word mnemonic: 128 bits entropy + 4 bits checksum = 132 bits
  // We have 11 words = 121 bits, need to find the 12th word that provides
  // the remaining 11 bits (7 bits entropy + 4 bits checksum)

  // Convert words to bit indices
  const indices = words.map((word) => {
    const idx = getWordIndex(word);
    if (idx === -1) {
      throw new Error(`Word "${word}" is not in the BIP-39 wordlist`);
    }
    return idx;
  });

  // Convert indices to bits
  // Each index is 11 bits, so 11 indices = 121 bits
  // We need to extract 128 bits of entropy (the first 121 bits from words,
  // plus 7 bits from the 12th word)
  // But for now, we just need the first 121 bits

  // Pack into bytes - 121 bits = 15 bytes + 1 bit
  const bits: number[] = [];
  for (const idx of indices) {
    for (let i = 10; i >= 0; i--) {
      bits.push((idx >> i) & 1);
    }
  }

  return new Uint8Array(bits);
}

/**
 * Calculates the 12th word (checksum word) for a modified mnemonic
 *
 * For a 12-word BIP-39 mnemonic:
 * - 128 bits of entropy
 * - 4 bits of checksum (SHA-256 hash of entropy)
 * - Total: 132 bits = 12 words × 11 bits
 *
 * When we modify the 11th word, we're changing bits 110-120 of the 132 bits.
 * The 12th word contains bits 121-131 (last 7 bits of entropy + 4 bits checksum).
 *
 * @param first11Words - Array of the first 11 words of the mnemonic
 * @returns Valid 12th word that makes the mnemonic valid
 */
export function calculateChecksumWord(first11Words: string[]): string {
  if (first11Words.length !== 11) {
    throw new Error(`Expected 11 words, got ${first11Words.length}`);
  }

  // Validate all words are in the wordlist
  for (const word of first11Words) {
    if (getWordIndex(word) === -1) {
      throw new Error(`Word "${word}" is not in the BIP-39 wordlist`);
    }
  }

  // Try each possible 12th word until we find one that creates a valid mnemonic
  // This is brute-force but only 2048 possibilities
  const testMnemonic = first11Words.join(' ');

  for (let i = 0; i < BIP39_WORDLIST_SIZE; i++) {
    const candidateWord = WORDLIST[i];
    const fullMnemonic = `${testMnemonic} ${candidateWord}`;

    if (bip39.validateMnemonic(fullMnemonic)) {
      return candidateWord;
    }
  }

  // This should never happen if the input words are valid
  throw new Error('Could not find a valid checksum word - this should not happen');
}

/**
 * Derives a sub-wallet mnemonic by modifying the 11th word
 *
 * @param masterMnemonic - Original 12-word mnemonic
 * @param subWalletIndex - Index 0-19 (0 = original, 1-19 = modified)
 * @returns New valid 12-word mnemonic
 * @throws Error if mnemonic is invalid or index is out of bounds
 */
export function deriveSubWalletMnemonic(
  masterMnemonic: string,
  subWalletIndex: number
): string {
  // Validate index
  if (!isValidSubWalletIndex(subWalletIndex)) {
    throw new Error(
      `Sub-wallet index ${subWalletIndex} is out of bounds (0-${MAX_SUB_WALLETS - 1})`
    );
  }

  // Validate master mnemonic
  if (!bip39.validateMnemonic(masterMnemonic)) {
    throw new Error('Invalid master mnemonic');
  }

  // If index is 0, return the original mnemonic unchanged
  if (subWalletIndex === 0) {
    return masterMnemonic;
  }

  // Split mnemonic into words
  const words = masterMnemonic.trim().split(/\s+/);
  if (words.length !== 12) {
    throw new Error(`Expected 12-word mnemonic, got ${words.length} words`);
  }

  // Get the 11th word (index 10) and increment it
  const original11thWord = words[10];
  const new11thWord = incrementWord(original11thWord, subWalletIndex);

  // Create new first 11 words with modified 11th word
  const first11Words = [...words.slice(0, 10), new11thWord];

  // Calculate the new 12th word (checksum)
  const new12thWord = calculateChecksumWord(first11Words);

  // Construct and validate the new mnemonic
  const newMnemonic = [...first11Words, new12thWord].join(' ');

  // Double-check validity
  if (!bip39.validateMnemonic(newMnemonic)) {
    throw new Error('Generated mnemonic is invalid - this should not happen');
  }

  return newMnemonic;
}

/**
 * Gets the next available sub-wallet index for a master key
 *
 * @param existingIndices - Array of indices already in use
 * @returns Next available index, or -1 if all slots are full
 */
export function getNextAvailableIndex(existingIndices: number[]): number {
  const usedSet = new Set(existingIndices);

  for (let i = 0; i < MAX_SUB_WALLETS; i++) {
    if (!usedSet.has(i)) {
      return i;
    }
  }

  return -1; // All slots full
}

/**
 * Validates that a mnemonic can support sub-wallet derivation
 * (i.e., it's a valid 12-word BIP-39 mnemonic)
 *
 * @param mnemonic - Mnemonic to validate
 * @returns true if valid for sub-wallet derivation
 */
export function canDeriveSubWallets(mnemonic: string): boolean {
  if (!bip39.validateMnemonic(mnemonic)) {
    return false;
  }

  const words = mnemonic.trim().split(/\s+/);
  return words.length === 12;
}

/**
 * Gets information about how a sub-wallet mnemonic differs from the master
 * Useful for debugging and UI display
 *
 * @param masterMnemonic - Original mnemonic
 * @param subWalletIndex - Sub-wallet index
 * @returns Object with derivation details
 */
export function getDerivationInfo(
  masterMnemonic: string,
  subWalletIndex: number
): {
  originalWord11: string;
  newWord11: string;
  originalWord12: string;
  newWord12: string;
  wordIndexChange: number;
} {
  const masterWords = masterMnemonic.trim().split(/\s+/);
  const derivedMnemonic = deriveSubWalletMnemonic(masterMnemonic, subWalletIndex);
  const derivedWords = derivedMnemonic.split(' ');

  return {
    originalWord11: masterWords[10],
    newWord11: derivedWords[10],
    originalWord12: masterWords[11],
    newWord12: derivedWords[11],
    wordIndexChange: subWalletIndex,
  };
}
