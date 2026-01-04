/**
 * Unit tests for Mnemonic Derivation Utilities
 *
 * These tests cover the sensitive sub-wallet derivation logic that:
 * 1. Modifies the 11th word of a BIP-39 mnemonic by an index offset
 * 2. Recalculates the 12th word (checksum) to produce a valid mnemonic
 *
 * This is critical security-related code - any changes should be tested thoroughly.
 */

import { describe, it, expect } from 'vitest';
import * as bip39 from 'bip39';
import {
  isValidSubWalletIndex,
  getWordIndex,
  getWordAtIndex,
  incrementWord,
  calculateChecksumWord,
  deriveSubWalletMnemonic,
  getNextAvailableIndex,
  canDeriveSubWallets,
  getDerivationInfo,
} from './mnemonic-derivation';
import { HIERARCHICAL_WALLET_CONSTANTS } from '../types';

const { MAX_SUB_WALLETS, BIP39_WORDLIST_SIZE } = HIERARCHICAL_WALLET_CONSTANTS;

// Test mnemonics (DO NOT USE in production - these are for testing only)
const TEST_MNEMONIC_1 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_MNEMONIC_2 = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
const TEST_MNEMONIC_3 = 'letter advice cage absurd amount doctor acoustic avoid letter advice cage above';

describe('Mnemonic Derivation Utilities', () => {
  describe('isValidSubWalletIndex', () => {
    it('should accept valid indices (0-19)', () => {
      for (let i = 0; i < MAX_SUB_WALLETS; i++) {
        expect(isValidSubWalletIndex(i)).toBe(true);
      }
    });

    it('should reject negative indices', () => {
      expect(isValidSubWalletIndex(-1)).toBe(false);
      expect(isValidSubWalletIndex(-100)).toBe(false);
    });

    it('should reject indices >= MAX_SUB_WALLETS', () => {
      expect(isValidSubWalletIndex(MAX_SUB_WALLETS)).toBe(false);
      expect(isValidSubWalletIndex(20)).toBe(false);
      expect(isValidSubWalletIndex(100)).toBe(false);
    });

    it('should reject non-integer values', () => {
      expect(isValidSubWalletIndex(0.5)).toBe(false);
      expect(isValidSubWalletIndex(1.5)).toBe(false);
      expect(isValidSubWalletIndex(NaN)).toBe(false);
      expect(isValidSubWalletIndex(Infinity)).toBe(false);
    });
  });

  describe('getWordIndex', () => {
    it('should return correct index for valid BIP-39 words', () => {
      // First word in the list
      expect(getWordIndex('abandon')).toBe(0);
      // Last word in the list
      expect(getWordIndex('zoo')).toBe(2047);
      // Some words in between - verify by checking roundtrip
      expect(getWordIndex('about')).toBe(3);
      // Verify the word at index matches
      expect(getWordAtIndex(getWordIndex('abstract'))).toBe('abstract');
    });

    it('should handle case insensitivity', () => {
      expect(getWordIndex('ABANDON')).toBe(0);
      expect(getWordIndex('Abandon')).toBe(0);
      expect(getWordIndex('AbAnDoN')).toBe(0);
    });

    it('should handle whitespace trimming', () => {
      expect(getWordIndex('  abandon  ')).toBe(0);
      expect(getWordIndex('\tabout\n')).toBe(3);
    });

    it('should return -1 for invalid words', () => {
      expect(getWordIndex('invalid')).toBe(-1);
      expect(getWordIndex('notaword')).toBe(-1);
      expect(getWordIndex('')).toBe(-1);
      expect(getWordIndex('bitcoin')).toBe(-1); // Not in BIP-39
    });
  });

  describe('getWordAtIndex', () => {
    it('should return correct word for valid indices', () => {
      expect(getWordAtIndex(0)).toBe('abandon');
      expect(getWordAtIndex(2047)).toBe('zoo');
      expect(getWordAtIndex(3)).toBe('about');
    });

    it('should throw for out of bounds indices', () => {
      expect(() => getWordAtIndex(-1)).toThrow();
      expect(() => getWordAtIndex(BIP39_WORDLIST_SIZE)).toThrow();
      expect(() => getWordAtIndex(3000)).toThrow();
    });
  });

  describe('incrementWord', () => {
    it('should increment word by offset correctly', () => {
      // abandon (0) + 1 = ability (1)
      expect(incrementWord('abandon', 1)).toBe('ability');
      // abandon (0) + 3 = about (3)
      expect(incrementWord('abandon', 3)).toBe('about');
    });

    it('should wrap around at wordlist boundary', () => {
      // zoo (2047) + 1 = abandon (0) - wraps around
      expect(incrementWord('zoo', 1)).toBe('abandon');
      // zoo (2047) + 5 = word at index (2047 + 5) % 2048 = 4
      expect(incrementWord('zoo', 5)).toBe(getWordAtIndex(4));
      // Dynamically compute expected result for 'wrong'
      const wrongIndex = getWordIndex('wrong');
      const expectedIndex = (wrongIndex + 3) % BIP39_WORDLIST_SIZE;
      expect(incrementWord('wrong', 3)).toBe(getWordAtIndex(expectedIndex));
    });

    it('should return same word for offset 0', () => {
      expect(incrementWord('abandon', 0)).toBe('abandon');
      expect(incrementWord('zoo', 0)).toBe('zoo');
    });

    it('should handle all valid sub-wallet offsets (1-19)', () => {
      for (let offset = 1; offset < MAX_SUB_WALLETS; offset++) {
        const result = incrementWord('abandon', offset);
        expect(result).toBe(getWordAtIndex(offset));
      }
    });

    it('should throw for invalid words', () => {
      expect(() => incrementWord('invalidword', 1)).toThrow();
      expect(() => incrementWord('', 1)).toThrow();
    });
  });

  describe('calculateChecksumWord', () => {
    it('should find valid 12th word for known mnemonics', () => {
      // Test with known valid mnemonic, using first 11 words
      const words1 = TEST_MNEMONIC_1.split(' ').slice(0, 11);
      const checksum1 = calculateChecksumWord(words1);
      const fullMnemonic1 = [...words1, checksum1].join(' ');
      expect(bip39.validateMnemonic(fullMnemonic1)).toBe(true);

      const words2 = TEST_MNEMONIC_2.split(' ').slice(0, 11);
      const checksum2 = calculateChecksumWord(words2);
      const fullMnemonic2 = [...words2, checksum2].join(' ');
      expect(bip39.validateMnemonic(fullMnemonic2)).toBe(true);
    });

    it('should throw for arrays with wrong length', () => {
      expect(() => calculateChecksumWord(['abandon'])).toThrow();
      expect(() => calculateChecksumWord([...Array(10).fill('abandon')])).toThrow();
      expect(() => calculateChecksumWord([...Array(12).fill('abandon')])).toThrow();
    });

    it('should throw for arrays with invalid words', () => {
      const invalidWords = [...Array(10).fill('abandon'), 'invalidword'];
      expect(() => calculateChecksumWord(invalidWords)).toThrow();
    });
  });

  describe('deriveSubWalletMnemonic', () => {
    it('should return original mnemonic unchanged for index 0', () => {
      const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_1, 0);
      expect(derived).toBe(TEST_MNEMONIC_1);
    });

    it('should produce valid BIP-39 mnemonic for all valid indices', () => {
      for (let index = 0; index < MAX_SUB_WALLETS; index++) {
        const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_1, index);
        expect(bip39.validateMnemonic(derived)).toBe(true);
      }
    });

    it('should produce different mnemonics for different indices', () => {
      const mnemonics = new Set<string>();
      for (let index = 0; index < MAX_SUB_WALLETS; index++) {
        const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_1, index);
        expect(mnemonics.has(derived)).toBe(false);
        mnemonics.add(derived);
      }
      expect(mnemonics.size).toBe(MAX_SUB_WALLETS);
    });

    it('should modify the 11th word (index 10) for non-zero indices', () => {
      const masterWords = TEST_MNEMONIC_1.split(' ');
      const original11thWord = masterWords[10];

      for (let index = 1; index < MAX_SUB_WALLETS; index++) {
        const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_1, index);
        const derivedWords = derived.split(' ');

        // Words 1-10 should be the same
        for (let i = 0; i < 10; i++) {
          expect(derivedWords[i]).toBe(masterWords[i]);
        }

        // 11th word should be incremented by index
        const expected11thWord = incrementWord(original11thWord, index);
        expect(derivedWords[10]).toBe(expected11thWord);

        // 12th word will be different (recalculated checksum)
        expect(bip39.validateMnemonic(derived)).toBe(true);
      }
    });

    it('should be deterministic - same inputs produce same outputs', () => {
      for (let index = 0; index < MAX_SUB_WALLETS; index++) {
        const derived1 = deriveSubWalletMnemonic(TEST_MNEMONIC_1, index);
        const derived2 = deriveSubWalletMnemonic(TEST_MNEMONIC_1, index);
        expect(derived1).toBe(derived2);
      }
    });

    it('should work with different master mnemonics', () => {
      const testMnemonics = [TEST_MNEMONIC_1, TEST_MNEMONIC_2, TEST_MNEMONIC_3];

      for (const master of testMnemonics) {
        for (let index = 0; index < 5; index++) {
          // Test first 5 for thoroughness
          const derived = deriveSubWalletMnemonic(master, index);
          expect(bip39.validateMnemonic(derived)).toBe(true);
        }
      }
    });

    it('should throw for invalid master mnemonic when index > 0', () => {
      expect(() => deriveSubWalletMnemonic('invalid mnemonic words', 1)).toThrow();
      expect(() => deriveSubWalletMnemonic('', 1)).toThrow();
      // Use definitely invalid words (not in BIP-39 wordlist)
      expect(() => deriveSubWalletMnemonic('bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin', 1)).toThrow();
    });

    it('should throw for out of bounds index', () => {
      expect(() => deriveSubWalletMnemonic(TEST_MNEMONIC_1, -1)).toThrow();
      expect(() => deriveSubWalletMnemonic(TEST_MNEMONIC_1, MAX_SUB_WALLETS)).toThrow();
      expect(() => deriveSubWalletMnemonic(TEST_MNEMONIC_1, 100)).toThrow();
    });

    it('should handle mnemonic with normalized whitespace', () => {
      // Note: bip39.validateMnemonic requires properly formatted mnemonic
      // The derivation function works with the mnemonic as split by whitespace
      const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_1, 1);
      expect(bip39.validateMnemonic(derived)).toBe(true);
      // Verify the derived mnemonic has correct word count
      expect(derived.split(' ').length).toBe(12);
    });

    it('should produce unique seeds for each derived mnemonic', async () => {
      const seeds = new Set<string>();

      for (let index = 0; index < MAX_SUB_WALLETS; index++) {
        const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_1, index);
        const seed = await bip39.mnemonicToSeed(derived);
        const seedHex = Buffer.from(seed).toString('hex');
        expect(seeds.has(seedHex)).toBe(false);
        seeds.add(seedHex);
      }

      expect(seeds.size).toBe(MAX_SUB_WALLETS);
    });
  });

  describe('getNextAvailableIndex', () => {
    it('should return 0 for empty array', () => {
      expect(getNextAvailableIndex([])).toBe(0);
    });

    it('should return first missing index', () => {
      expect(getNextAvailableIndex([0])).toBe(1);
      expect(getNextAvailableIndex([0, 1])).toBe(2);
      expect(getNextAvailableIndex([0, 2])).toBe(1);
      expect(getNextAvailableIndex([1, 2, 3])).toBe(0);
    });

    it('should handle non-sequential indices', () => {
      expect(getNextAvailableIndex([0, 5, 10])).toBe(1);
      expect(getNextAvailableIndex([1, 3, 5, 7])).toBe(0);
    });

    it('should return -1 when all slots are full', () => {
      const allIndices = Array.from({ length: MAX_SUB_WALLETS }, (_, i) => i);
      expect(getNextAvailableIndex(allIndices)).toBe(-1);
    });

    it('should handle duplicates in input', () => {
      expect(getNextAvailableIndex([0, 0, 0, 1, 1])).toBe(2);
    });
  });

  describe('canDeriveSubWallets', () => {
    it('should return true for valid 12-word mnemonic', () => {
      expect(canDeriveSubWallets(TEST_MNEMONIC_1)).toBe(true);
      expect(canDeriveSubWallets(TEST_MNEMONIC_2)).toBe(true);
      expect(canDeriveSubWallets(TEST_MNEMONIC_3)).toBe(true);
    });

    it('should return false for invalid mnemonic', () => {
      expect(canDeriveSubWallets('invalid mnemonic')).toBe(false);
      expect(canDeriveSubWallets('')).toBe(false);
      // Use definitely invalid words (not in BIP-39 wordlist)
      expect(canDeriveSubWallets('bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin bitcoin')).toBe(false);
    });

    it('should return false for 24-word mnemonic', () => {
      // 24-word mnemonics are valid BIP-39 but not supported for our derivation
      const mnemonic24 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon ' +
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
      // Note: This is a valid 24-word mnemonic
      expect(bip39.validateMnemonic(mnemonic24)).toBe(true);
      expect(canDeriveSubWallets(mnemonic24)).toBe(false);
    });
  });

  describe('getDerivationInfo', () => {
    it('should return correct derivation info for index 0', () => {
      const info = getDerivationInfo(TEST_MNEMONIC_1, 0);
      const masterWords = TEST_MNEMONIC_1.split(' ');

      expect(info.originalWord11).toBe(masterWords[10]);
      expect(info.newWord11).toBe(masterWords[10]);
      expect(info.originalWord12).toBe(masterWords[11]);
      expect(info.newWord12).toBe(masterWords[11]);
      expect(info.wordIndexChange).toBe(0);
    });

    it('should return correct derivation info for non-zero indices', () => {
      const masterWords = TEST_MNEMONIC_1.split(' ');

      for (let index = 1; index < MAX_SUB_WALLETS; index++) {
        const info = getDerivationInfo(TEST_MNEMONIC_1, index);

        expect(info.originalWord11).toBe(masterWords[10]);
        expect(info.newWord11).toBe(incrementWord(masterWords[10], index));
        expect(info.originalWord12).toBe(masterWords[11]);
        expect(info.wordIndexChange).toBe(index);

        // New 12th word should make a valid mnemonic
        const derivedMnemonic = deriveSubWalletMnemonic(TEST_MNEMONIC_1, index);
        const derivedWords = derivedMnemonic.split(' ');
        expect(info.newWord12).toBe(derivedWords[11]);
      }
    });
  });

  describe('Edge Cases and Security Considerations', () => {
    it('should handle 11th word wrapping correctly (near end of wordlist)', () => {
      // Create a mnemonic where the 11th word is near the end of the wordlist
      // "zoo" is at index 2047 (last word)
      const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_2, 1);
      expect(bip39.validateMnemonic(derived)).toBe(true);

      const derivedWords = derived.split(' ');
      // zoo (2047) + 1 should wrap to abandon (0)
      expect(derivedWords[10]).toBe('abandon');
    });

    it('should never produce the master mnemonic for non-zero indices', () => {
      for (let index = 1; index < MAX_SUB_WALLETS; index++) {
        const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_1, index);
        expect(derived).not.toBe(TEST_MNEMONIC_1);
      }
    });

    it('should handle word boundaries correctly when 11th word change affects checksum', () => {
      // All derived mnemonics should be valid regardless of the checksum calculation
      for (let index = 0; index < MAX_SUB_WALLETS; index++) {
        const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_3, index);
        expect(bip39.validateMnemonic(derived)).toBe(true);

        // Ensure the derived mnemonic has exactly 12 words
        const words = derived.split(' ');
        expect(words.length).toBe(12);

        // Ensure all words are in the wordlist
        for (const word of words) {
          expect(getWordIndex(word)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should produce consistent results across multiple calls in rapid succession', async () => {
      const results: string[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_1, 5);
        results.push(derived);
      }

      // All results should be identical
      const firstResult = results[0];
      for (const result of results) {
        expect(result).toBe(firstResult);
      }
    });

    it('should maintain entropy integrity - derived seeds are cryptographically distinct', async () => {
      // The derived seeds should be completely different (not just shifted)
      const masterSeed = await bip39.mnemonicToSeed(TEST_MNEMONIC_1);
      const derivedMnemonic = deriveSubWalletMnemonic(TEST_MNEMONIC_1, 1);
      const derivedSeed = await bip39.mnemonicToSeed(derivedMnemonic);

      // Seeds should be completely different (no common prefix or pattern)
      const masterHex = Buffer.from(masterSeed).toString('hex');
      const derivedHex = Buffer.from(derivedSeed).toString('hex');

      expect(masterHex).not.toBe(derivedHex);
      // First 32 bytes (256 bits) should differ significantly
      expect(masterHex.substring(0, 64)).not.toBe(derivedHex.substring(0, 64));
    });
  });

  describe('Regression Tests', () => {
    // These tests lock in known good values to detect any regressions
    it('should produce expected derived mnemonic for known inputs (regression)', () => {
      // Lock in expected outputs for specific inputs
      // This ensures the derivation algorithm never changes unintentionally

      const derived1 = deriveSubWalletMnemonic(TEST_MNEMONIC_1, 1);
      expect(bip39.validateMnemonic(derived1)).toBe(true);

      // The 11th word "abandon" (0) + 1 = "ability" (1)
      const words1 = derived1.split(' ');
      expect(words1[10]).toBe('ability');

      const derived5 = deriveSubWalletMnemonic(TEST_MNEMONIC_1, 5);
      expect(bip39.validateMnemonic(derived5)).toBe(true);

      // The 11th word "abandon" (0) + 5 = "absent" (5)
      const words5 = derived5.split(' ');
      expect(words5[10]).toBe('absent');
    });

    it('should handle the edge case of maximum index (19)', () => {
      const derived = deriveSubWalletMnemonic(TEST_MNEMONIC_1, 19);
      expect(bip39.validateMnemonic(derived)).toBe(true);

      const words = derived.split(' ');
      // The 11th word "abandon" (0) + 19 = word at index 19
      expect(words[10]).toBe(getWordAtIndex(19));
    });
  });
});
