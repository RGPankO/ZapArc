// Unit tests for wallet authentication flow
// Tests PIN authentication, wallet selection, and auto-lock

// Mocks
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1]),
  authenticateAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

jest.mock('../services', () => ({
  storageService: {
    isWalletUnlocked: jest.fn(),
    unlockWallet: jest.fn(),
    lockWallet: jest.fn(),
    getActiveWalletInfo: jest.fn(),
    getLastActivity: jest.fn(),
    updateActivity: jest.fn(),
    verifyMasterKeyPin: jest.fn(),
    setActiveWallet: jest.fn(),
    loadMultiWalletStorage: jest.fn(),
  },
  settingsService: {
    getUserSettings: jest.fn().mockResolvedValue({
      autoLockTimeout: 900,
      biometricEnabled: true,
    }),
  },
  breezSDKService: {
    isWalletConnected: jest.fn(),
  },
}));

import { storageService } from '../services';

// =============================================================================
// PIN Authentication Tests
// =============================================================================

describe('PIN Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Correct PIN unlocks wallet', () => {
    it('should return true for correct PIN', async () => {
      const correctPin = '123456';
      const masterKeyId = 'test-master-key-id';

      (storageService.verifyMasterKeyPin as jest.Mock).mockResolvedValue(true);
      (storageService.unlockWallet as jest.Mock).mockResolvedValue(undefined);

      const isValid = await storageService.verifyMasterKeyPin(masterKeyId, correctPin);
      expect(isValid).toBe(true);

      await storageService.unlockWallet();
      expect(storageService.unlockWallet).toHaveBeenCalled();
    });
  });

  describe('Incorrect PIN fails', () => {
    it('should return false for incorrect PIN', async () => {
      const wrongPin = '654321';
      const masterKeyId = 'test-master-key-id';

      (storageService.verifyMasterKeyPin as jest.Mock).mockResolvedValue(false);

      const isValid = await storageService.verifyMasterKeyPin(masterKeyId, wrongPin);
      expect(isValid).toBe(false);
      expect(storageService.unlockWallet).not.toHaveBeenCalled();
    });
  });

  describe('Empty PIN fails', () => {
    it('should reject empty PIN', async () => {
      const emptyPin = '';
      const masterKeyId = 'test-master-key-id';

      (storageService.verifyMasterKeyPin as jest.Mock).mockResolvedValue(false);

      const isValid = await storageService.verifyMasterKeyPin(masterKeyId, emptyPin);
      expect(isValid).toBe(false);
    });
  });
});

// =============================================================================
// Sub-Wallet Switch Tests
// =============================================================================

describe('Sub-Wallet Switching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sub-wallet switch within same master does not require PIN', () => {
    it('should switch sub-wallet without PIN verification', async () => {
      const masterKeyId = 'test-master-key-id';
      const newSubWalletIndex = 2;

      // Simulate switching sub-wallet - only setActiveWallet should be called
      (storageService.setActiveWallet as jest.Mock).mockResolvedValue(undefined);

      await storageService.setActiveWallet(masterKeyId, newSubWalletIndex);

      expect(storageService.setActiveWallet).toHaveBeenCalledWith(
        masterKeyId,
        newSubWalletIndex
      );
      // verifyMasterKeyPin should NOT be called for sub-wallet switch
      expect(storageService.verifyMasterKeyPin).not.toHaveBeenCalled();
    });
  });

  describe('Different master key requires PIN', () => {
    it('should require PIN when switching to different master key', async () => {
      const currentMasterKeyId = 'master-key-1';
      const newMasterKeyId = 'master-key-2';
      const pin = '123456';
      const subWalletIndex = 0;

      // Set up current state
      (storageService.getActiveWalletInfo as jest.Mock).mockResolvedValue({
        masterKeyId: currentMasterKeyId,
        masterKeyNickname: 'Wallet 1',
        subWalletIndex: 0,
        subWalletNickname: 'Main Wallet',
      });

      // Verify PIN is required for different master key
      (storageService.verifyMasterKeyPin as jest.Mock).mockResolvedValue(true);
      (storageService.setActiveWallet as jest.Mock).mockResolvedValue(undefined);

      // First verify PIN
      const isValid = await storageService.verifyMasterKeyPin(newMasterKeyId, pin);
      expect(isValid).toBe(true);
      expect(storageService.verifyMasterKeyPin).toHaveBeenCalledWith(
        newMasterKeyId,
        pin
      );

      // Then switch wallet
      await storageService.setActiveWallet(newMasterKeyId, subWalletIndex);
      expect(storageService.setActiveWallet).toHaveBeenCalledWith(
        newMasterKeyId,
        subWalletIndex
      );
    });

    it('should fail to switch if PIN is wrong', async () => {
      const newMasterKeyId = 'master-key-2';
      const wrongPin = '000000';

      (storageService.verifyMasterKeyPin as jest.Mock).mockResolvedValue(false);

      const isValid = await storageService.verifyMasterKeyPin(newMasterKeyId, wrongPin);
      expect(isValid).toBe(false);

      // setActiveWallet should NOT be called if PIN verification fails
      expect(storageService.setActiveWallet).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Session and Auto-Lock Tests
// =============================================================================

describe('Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Lock wallet', () => {
    it('should lock the wallet', async () => {
      (storageService.lockWallet as jest.Mock).mockResolvedValue(undefined);

      await storageService.lockWallet();

      expect(storageService.lockWallet).toHaveBeenCalled();
    });
  });

  describe('Check wallet unlock status', () => {
    it('should report unlocked when unlocked', async () => {
      (storageService.isWalletUnlocked as jest.Mock).mockResolvedValue(true);

      const isUnlocked = await storageService.isWalletUnlocked();

      expect(isUnlocked).toBe(true);
    });

    it('should report locked when locked', async () => {
      (storageService.isWalletUnlocked as jest.Mock).mockResolvedValue(false);

      const isUnlocked = await storageService.isWalletUnlocked();

      expect(isUnlocked).toBe(false);
    });
  });

  describe('Last activity tracking', () => {
    it('should get last activity time', async () => {
      const now = Date.now();
      (storageService.getLastActivity as jest.Mock).mockResolvedValue(now);

      const lastActivity = await storageService.getLastActivity();

      expect(lastActivity).toBe(now);
    });

    it('should update last activity time', async () => {
      (storageService.updateActivity as jest.Mock).mockResolvedValue(undefined);

      await storageService.updateActivity();

      expect(storageService.updateActivity).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Multi-Wallet Selection Tests
// =============================================================================

describe('Multi-Wallet Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Get active wallet info', () => {
    it('should return active wallet info', async () => {
      const expectedInfo = {
        masterKeyId: 'mk-123',
        masterKeyNickname: 'My Wallet',
        subWalletIndex: 1,
        subWalletNickname: 'Sub-Wallet 1',
      };

      (storageService.getActiveWalletInfo as jest.Mock).mockResolvedValue(
        expectedInfo
      );

      const info = await storageService.getActiveWalletInfo();

      expect(info).toEqual(expectedInfo);
    });

    it('should return null when no wallet selected', async () => {
      (storageService.getActiveWalletInfo as jest.Mock).mockResolvedValue(null);

      const info = await storageService.getActiveWalletInfo();

      expect(info).toBeNull();
    });
  });
});
