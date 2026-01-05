/**
 * Unit tests for Tip Request Generation
 * Tests the tip request format: [lntip:lnurl:<address>:<amt1>:<amt2>:<amt3>]
 */

import {
  parseTipRequest,
  generateTipRequest,
  validateTipAmounts,
  DEFAULT_TIP_AMOUNTS,
  isLightningAddress,
  isValidLnurlFormat,
} from '../utils/lnurl';

describe('Tip Request Generation', () => {
  describe('generateTipRequest', () => {
    it('should generate correct format with Lightning address', () => {
      const result = generateTipRequest('user@wallet.com', [100, 500, 1000]);
      expect(result).toBe('[lntip:lnurl:user@wallet.com:100:500:1000]');
    });

    it('should generate correct format with LNURL', () => {
      const lnurl = 'lnurl1dp68gurn8ghj7um9dej8xct5wvhxjmn9w3k8jtnrdakj7';
      const result = generateTipRequest(lnurl, [50, 250, 1000]);
      expect(result).toBe(`[lntip:lnurl:${lnurl}:50:250:1000]`);
    });

    it('should throw error for invalid address', () => {
      expect(() => generateTipRequest('invalid', [100, 500, 1000])).toThrow(
        'Invalid LNURL or Lightning address format'
      );
    });

    it('should throw error for negative amounts', () => {
      expect(() =>
        generateTipRequest('user@wallet.com', [-100, 500, 1000])
      ).toThrow('Invalid amounts - must be positive integers');
    });

    it('should throw error for zero amounts', () => {
      expect(() =>
        generateTipRequest('user@wallet.com', [0, 500, 1000])
      ).toThrow('Invalid amounts - must be positive integers');
    });

    it('should throw error for amounts over 100M sats', () => {
      expect(() =>
        generateTipRequest('user@wallet.com', [100, 500, 200_000_000])
      ).toThrow('Amounts must not exceed 100000000 sats');
    });

    it('should use default amounts when configured', () => {
      // Default amounts should be [100, 500, 1000]
      expect(DEFAULT_TIP_AMOUNTS).toEqual([100, 500, 1000]);
    });
  });

  describe('parseTipRequest', () => {
    it('should parse valid tip request with Lightning address', () => {
      const tipString = '[lntip:lnurl:user@wallet.com:100:500:1000]';
      const result = parseTipRequest(tipString);

      expect(result.isValid).toBe(true);
      expect(result.lnurl).toBe('user@wallet.com');
      expect(result.suggestedAmounts).toEqual([100, 500, 1000]);
      expect(result.error).toBeUndefined();
    });

    it('should parse valid tip request with LNURL', () => {
      const lnurl = 'lnurl1dp68gurn8ghj7um9dej8xct5wvhxjmn9w3k8jtnrdakj7';
      const tipString = `[lntip:lnurl:${lnurl}:50:250:1000]`;
      const result = parseTipRequest(tipString);

      expect(result.isValid).toBe(true);
      expect(result.lnurl).toBe(lnurl);
      expect(result.suggestedAmounts).toEqual([50, 250, 1000]);
    });

    it('should return invalid for malformed tip request', () => {
      const result = parseTipRequest('[lntip:invalid:format]');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid tip request format');
    });

    it('should return invalid for empty string', () => {
      const result = parseTipRequest('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid tip request format');
    });

    it('should return invalid for missing brackets', () => {
      const result = parseTipRequest('lntip:lnurl:user@wallet.com:100:500:1000');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid tip request format');
    });

    it('should parse amounts as integers', () => {
      const tipString = '[lntip:lnurl:user@wallet.com:100:500:1000]';
      const result = parseTipRequest(tipString);

      expect(result.suggestedAmounts[0]).toBe(100);
      expect(result.suggestedAmounts[1]).toBe(500);
      expect(result.suggestedAmounts[2]).toBe(1000);
      expect(typeof result.suggestedAmounts[0]).toBe('number');
    });
  });

  describe('validateTipAmounts', () => {
    it('should validate correct amounts', () => {
      const result = validateTipAmounts([100, 500, 1000]);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject duplicate amounts', () => {
      const result = validateTipAmounts([100, 100, 1000]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('All three amounts must be unique');
    });

    it('should reject negative amounts', () => {
      const result = validateTipAmounts([-100, 500, 1000]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('All amounts must be positive integers');
    });

    it('should reject zero amounts', () => {
      const result = validateTipAmounts([0, 500, 1000]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('All amounts must be positive integers');
    });

    it('should reject amounts over 100M sats (1 BTC)', () => {
      const result = validateTipAmounts([100, 500, 200_000_000]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must not exceed');
    });

    it('should accept maximum valid amount (100M sats)', () => {
      const result = validateTipAmounts([100, 500, 100_000_000]);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-integer amounts', () => {
      const result = validateTipAmounts([100.5, 500, 1000] as [
        number,
        number,
        number
      ]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('All amounts must be positive integers');
    });
  });

  describe('Lightning Address Validation', () => {
    it('should validate correct Lightning address', () => {
      expect(isLightningAddress('user@wallet.com')).toBe(true);
      expect(isLightningAddress('satoshi@bitcoin.org')).toBe(true);
      expect(isLightningAddress('test.user@domain.co')).toBe(true);
    });

    it('should reject invalid Lightning addresses', () => {
      expect(isLightningAddress('invalid')).toBe(false);
      expect(isLightningAddress('user@')).toBe(false);
      expect(isLightningAddress('@domain.com')).toBe(false);
      expect(isLightningAddress('user@domain')).toBe(false); // no TLD
      expect(isLightningAddress('lnurl1abc@domain.com')).toBe(false); // starts with lnurl
    });
  });

  describe('LNURL Format Validation', () => {
    it('should validate correct LNURL format', () => {
      expect(
        isValidLnurlFormat('lnurl1dp68gurn8ghj7um9dej8xct5wvhxjmn9w3k8jtnrdakj7')
      ).toBe(true);
    });

    it('should reject invalid LNURL format', () => {
      expect(isValidLnurlFormat('invalid')).toBe(false);
      expect(isValidLnurlFormat('lnurl')).toBe(false); // too short
      expect(isValidLnurlFormat('lnurl123')).toBe(false); // invalid chars
    });
  });
});

describe('Tip Request Round-Trip', () => {
  it('should generate and parse correctly', () => {
    const address = 'user@wallet.com';
    const amounts: [number, number, number] = [100, 500, 1000];

    const generated = generateTipRequest(address, amounts);
    const parsed = parseTipRequest(generated);

    expect(parsed.isValid).toBe(true);
    expect(parsed.lnurl).toBe(address);
    expect(parsed.suggestedAmounts).toEqual(amounts);
  });

  it('should preserve large amounts', () => {
    const address = 'user@wallet.com';
    const amounts: [number, number, number] = [1_000_000, 10_000_000, 50_000_000];

    const generated = generateTipRequest(address, amounts);
    const parsed = parseTipRequest(generated);

    expect(parsed.isValid).toBe(true);
    expect(parsed.suggestedAmounts).toEqual(amounts);
  });
});
