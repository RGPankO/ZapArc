// Unit tests for LNURL utilities
// Tests Lightning address validation, tip request parsing, and LNURL extraction

import {
  isLightningAddress,
  parseLightningAddress,
  convertToLnurlEndpoint,
  isValidLnurlFormat,
  isValidLnurlOrAddress,
  extractLnurl,
  parseTipRequest,
  generateTipRequest,
  validateTipAmounts,
  DEFAULT_TIP_AMOUNTS,
} from '../utils/lnurl';

// =============================================================================
// Lightning Address Tests
// =============================================================================

describe('Lightning Address Utilities', () => {
  describe('isLightningAddress', () => {
    it('should return true for valid Lightning addresses', () => {
      expect(isLightningAddress('user@example.com')).toBe(true);
      expect(isLightningAddress('satoshi@bitcoin.org')).toBe(true);
      expect(isLightningAddress('test.user@ln.domain.io')).toBe(true);
      expect(isLightningAddress('user-name@subdomain.example.com')).toBe(true);
      expect(isLightningAddress('user_123@wallet.com')).toBe(true);
    });

    it('should return false for invalid Lightning addresses', () => {
      // No @
      expect(isLightningAddress('userexample.com')).toBe(false);
      // No domain
      expect(isLightningAddress('user@')).toBe(false);
      // No username
      expect(isLightningAddress('@example.com')).toBe(false);
      // No TLD
      expect(isLightningAddress('user@localhost')).toBe(false);
      // Multiple @
      expect(isLightningAddress('user@foo@bar.com')).toBe(false);
      // LNURL (starts with lnurl)
      expect(isLightningAddress('lnurl1abc@example.com')).toBe(false);
      // Invalid characters
      expect(isLightningAddress('user name@example.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isLightningAddress('')).toBe(false);
      expect(isLightningAddress('   ')).toBe(false);
      expect(isLightningAddress('  user@example.com  ')).toBe(true);
    });
  });

  describe('parseLightningAddress', () => {
    it('should parse valid Lightning addresses', () => {
      const result = parseLightningAddress('user@example.com');
      expect(result).toEqual({ username: 'user', domain: 'example.com' });
    });

    it('should return null for invalid addresses', () => {
      expect(parseLightningAddress('invalid')).toBeNull();
      expect(parseLightningAddress('user@')).toBeNull();
      expect(parseLightningAddress('')).toBeNull();
    });
  });

  describe('convertToLnurlEndpoint', () => {
    it('should convert Lightning address to LNURL endpoint', () => {
      expect(convertToLnurlEndpoint('user@example.com')).toBe(
        'https://example.com/.well-known/lnurlp/user'
      );
      expect(convertToLnurlEndpoint('satoshi@bitcoin.org')).toBe(
        'https://bitcoin.org/.well-known/lnurlp/satoshi'
      );
    });

    it('should return LNURL unchanged', () => {
      const lnurl = 'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcen';
      expect(convertToLnurlEndpoint(lnurl)).toBe(lnurl);
    });

    it('should handle whitespace', () => {
      expect(convertToLnurlEndpoint('  user@example.com  ')).toBe(
        'https://example.com/.well-known/lnurlp/user'
      );
    });
  });
});

// =============================================================================
// LNURL Validation Tests
// =============================================================================

describe('LNURL Validation', () => {
  describe('isValidLnurlFormat', () => {
    it('should return true for valid LNURL strings', () => {
      // Valid bech32 encoded LNURLs
      expect(
        isValidLnurlFormat('lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcen')
      ).toBe(true);
      expect(
        isValidLnurlFormat('LNURL1DP68GURN8GHJ7UM9WFMXJCM99E3K7MF0V9CXJ0M385EKVCEN')
      ).toBe(true);
    });

    it('should return false for invalid LNURL strings', () => {
      // Too short
      expect(isValidLnurlFormat('lnurl1abc')).toBe(false);
      // Doesn't start with lnurl
      expect(isValidLnurlFormat('abc123')).toBe(false);
      // Empty
      expect(isValidLnurlFormat('')).toBe(false);
    });
  });

  describe('isValidLnurlOrAddress', () => {
    it('should return true for valid LNURL or Lightning address', () => {
      expect(isValidLnurlOrAddress('user@example.com')).toBe(true);
      expect(
        isValidLnurlOrAddress('lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcen')
      ).toBe(true);
    });

    it('should return false for invalid input', () => {
      expect(isValidLnurlOrAddress('invalid')).toBe(false);
      expect(isValidLnurlOrAddress('')).toBe(false);
    });
  });
});

// =============================================================================
// LNURL Extraction Tests
// =============================================================================

describe('extractLnurl', () => {
  it('should extract Lightning address from input', () => {
    expect(extractLnurl('user@example.com')).toBe('user@example.com');
    expect(extractLnurl('  user@example.com  ')).toBe('user@example.com');
  });

  it('should extract LNURL from input', () => {
    const lnurl = 'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcen';
    expect(extractLnurl(lnurl)).toBe(lnurl);
    expect(extractLnurl(lnurl.toUpperCase())).toBe(lnurl);
  });

  it('should handle lightning: URI scheme', () => {
    expect(extractLnurl('lightning:user@example.com')).toBe('user@example.com');
    expect(extractLnurl('LIGHTNING:user@example.com')).toBe('user@example.com');
  });

  it('should return null for invalid input', () => {
    expect(extractLnurl('invalid')).toBeNull();
    expect(extractLnurl('')).toBeNull();
    expect(extractLnurl('http://example.com')).toBeNull();
  });
});

// =============================================================================
// Tip Request Tests
// =============================================================================

describe('Tip Request Parsing and Generation', () => {
  describe('parseTipRequest', () => {
    it('should parse valid tip request', () => {
      const tipString = '[lntip:lnurl:lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcen:100:500:1000]';
      const result = parseTipRequest(tipString);

      expect(result.isValid).toBe(true);
      expect(result.lnurl).toBe('lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcen');
      expect(result.suggestedAmounts).toEqual([100, 500, 1000]);
    });

    it('should parse tip request with Lightning address', () => {
      const tipString = '[lntip:lnurl:user@example.com:50:100:200]';
      const result = parseTipRequest(tipString);

      expect(result.isValid).toBe(true);
      expect(result.lnurl).toBe('user@example.com');
      expect(result.suggestedAmounts).toEqual([50, 100, 200]);
    });

    it('should return error for invalid format', () => {
      const result = parseTipRequest('invalid tip string');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid tip request format');
    });

    it('should return error for invalid amounts', () => {
      const tipString = '[lntip:lnurl:user@example.com:0:100:200]';
      const result = parseTipRequest(tipString);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid suggested amounts');
    });
  });

  describe('generateTipRequest', () => {
    it('should generate valid tip request with LNURL', () => {
      const lnurl = 'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcen';
      const amounts: [number, number, number] = [100, 500, 1000];
      const result = generateTipRequest(lnurl, amounts);

      expect(result).toBe(`[lntip:lnurl:${lnurl}:100:500:1000]`);
    });

    it('should generate valid tip request with Lightning address', () => {
      const address = 'user@example.com';
      const amounts: [number, number, number] = [50, 100, 200];
      const result = generateTipRequest(address, amounts);

      expect(result).toBe('[lntip:lnurl:user@example.com:50:100:200]');
    });

    it('should throw error for invalid LNURL', () => {
      expect(() => generateTipRequest('invalid', [100, 500, 1000])).toThrow(
        'Invalid LNURL or Lightning address format'
      );
    });

    it('should throw error for invalid amounts', () => {
      expect(() => generateTipRequest('user@example.com', [0, 100, 200])).toThrow(
        'Invalid amounts - must be positive integers'
      );
    });

    it('should throw error for amount exceeding max', () => {
      expect(() =>
        generateTipRequest('user@example.com', [100_000_001, 100, 200])
      ).toThrow('Amounts must not exceed 100000000 sats');
    });
  });

  describe('validateTipAmounts', () => {
    it('should return valid for proper amounts', () => {
      const result = validateTipAmounts([100, 500, 1000]);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-positive amounts', () => {
      const result = validateTipAmounts([0, 100, 200]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('positive integers');
    });

    it('should reject amounts exceeding max', () => {
      const result = validateTipAmounts([100_000_001, 100, 200]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('100,000,000');
    });

    it('should reject duplicate amounts', () => {
      const result = validateTipAmounts([100, 100, 200]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('unique');
    });
  });
});

// =============================================================================
// Default Values Tests
// =============================================================================

describe('Default Values', () => {
  it('should have valid default tip amounts', () => {
    expect(DEFAULT_TIP_AMOUNTS).toEqual([100, 500, 1000]);
    const validation = validateTipAmounts(DEFAULT_TIP_AMOUNTS);
    expect(validation.isValid).toBe(true);
  });
});
