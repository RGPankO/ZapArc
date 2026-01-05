// i18n (Internationalization) Service
// Handles translations for English and Bulgarian

import { settingsService } from './settingsService';
import { locationService } from './locationService';

// =============================================================================
// Types
// =============================================================================

export type SupportedLanguage = 'en' | 'bg';

export interface TranslationParams {
  [key: string]: string | number;
}

type TranslationValue = string | { [key: string]: TranslationValue };

export interface TranslationSet {
  [key: string]: TranslationValue;
}

// =============================================================================
// Translations
// =============================================================================

const translations: Record<SupportedLanguage, TranslationSet> = {
  en: {
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      done: 'Done',
      next: 'Next',
      back: 'Back',
      skip: 'Skip',
      retry: 'Retry',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      copied: 'Copied!',
      share: 'Share',
    },

    // Auth
    auth: {
      enterPin: 'Enter your PIN',
      createPin: 'Create a PIN',
      confirmPin: 'Confirm your PIN',
      wrongPin: 'Wrong PIN. Please try again.',
      pinMismatch: 'PINs do not match. Please try again.',
      unlockWallet: 'Unlock Wallet',
      useBiometric: 'Use biometric',
      forgotPin: 'Forgot PIN?',
    },

    // Wallet
    wallet: {
      balance: 'Balance',
      sats: 'sats',
      send: 'Send',
      receive: 'Receive',
      transactions: 'Transactions',
      noTransactions: 'No transactions yet',
      createWallet: 'Create Wallet',
      importWallet: 'Import Wallet',
      enterMnemonic: 'Enter your 12-word recovery phrase',
      walletCreated: 'Wallet created successfully!',
      walletImported: 'Wallet imported successfully!',
      invalidMnemonic: 'Invalid recovery phrase. Please check and try again.',
      masterKey: 'Master Key',
      subWallet: 'Sub-Wallet',
      addSubWallet: 'Add Sub-Wallet',
      manageWallets: 'Manage Wallets',
      switchWallet: 'Switch Wallet',
      archiveWallet: 'Archive Wallet',
      restoreWallet: 'Restore Wallet',
      deleteWallet: 'Delete Wallet',
      deleteConfirm: 'Are you sure you want to delete this wallet?',
      backupReminder: 'Please backup your recovery phrase!',
      copyMnemonic: 'Copy Recovery Phrase',
      showMnemonic: 'Show Recovery Phrase',
    },

    // Payments
    payments: {
      amount: 'Amount',
      amountSats: 'Amount (sats)',
      enterAmount: 'Enter amount',
      description: 'Description (optional)',
      invoice: 'Lightning Invoice',
      pasteInvoice: 'Paste invoice',
      scanQR: 'Scan QR Code',
      generateInvoice: 'Generate Invoice',
      sendPayment: 'Send Payment',
      paymentSent: 'Payment sent!',
      paymentReceived: 'Payment received!',
      paymentFailed: 'Payment failed',
      insufficientBalance: 'Insufficient balance',
      invalidInvoice: 'Invalid invoice',
      tip: 'Tip',
      tipSent: 'Tip sent successfully!',
    },

    // Settings
    settings: {
      title: 'Settings',
      language: 'Language',
      english: 'English',
      bulgarian: 'Bulgarian',
      currency: 'Currency',
      security: 'Security',
      biometric: 'Biometric Authentication',
      autoLockTimeout: 'Auto-lock timeout',
      changePin: 'Change PIN',
      notifications: 'Notifications',
      about: 'About',
      version: 'Version',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      logout: 'Log out',
    },

    // Onboarding
    onboarding: {
      welcome: 'Welcome to Zap Arc',
      subtitle: 'Your Lightning Network wallet',
      getStarted: 'Get Started',
      createNew: 'Create New Wallet',
      importExisting: 'Import Existing Wallet',
      locationPermission: 'Location access helps us provide a better experience',
      allowLocation: 'Allow Location',
      skipLocation: 'Skip for now',
    },

    // Errors
    errors: {
      networkError: 'Network error. Please check your connection.',
      unknownError: 'An unknown error occurred. Please try again.',
      sessionExpired: 'Your session has expired. Please unlock again.',
      walletNotFound: 'Wallet not found.',
    },
  },

  bg: {
    // Common - Bulgarian
    common: {
      loading: 'Зареждане...',
      error: 'Грешка',
      success: 'Успех',
      cancel: 'Отказ',
      confirm: 'Потвърди',
      save: 'Запази',
      delete: 'Изтрий',
      edit: 'Редактирай',
      done: 'Готово',
      next: 'Напред',
      back: 'Назад',
      skip: 'Пропусни',
      retry: 'Опитай отново',
      close: 'Затвори',
      yes: 'Да',
      no: 'Не',
      ok: 'OK',
      copied: 'Копирано!',
      share: 'Сподели',
    },

    // Auth - Bulgarian
    auth: {
      enterPin: 'Въведете ПИН',
      createPin: 'Създайте ПИН',
      confirmPin: 'Потвърдете ПИН',
      wrongPin: 'Грешен ПИН. Опитайте отново.',
      pinMismatch: 'ПИН кодовете не съвпадат. Опитайте отново.',
      unlockWallet: 'Отключи портфейла',
      useBiometric: 'Използвай биометрия',
      forgotPin: 'Забравен ПИН?',
    },

    // Wallet - Bulgarian
    wallet: {
      balance: 'Баланс',
      sats: 'сатс',
      send: 'Изпрати',
      receive: 'Получи',
      transactions: 'Транзакции',
      noTransactions: 'Все още няма транзакции',
      createWallet: 'Създай портфейл',
      importWallet: 'Импортирай портфейл',
      enterMnemonic: 'Въведете вашата 12-думова фраза за възстановяване',
      walletCreated: 'Портфейлът е създаден успешно!',
      walletImported: 'Портфейлът е импортиран успешно!',
      invalidMnemonic: 'Невалидна фраза за възстановяване. Проверете и опитайте отново.',
      masterKey: 'Главен ключ',
      subWallet: 'Под-портфейл',
      addSubWallet: 'Добави под-портфейл',
      manageWallets: 'Управление на портфейли',
      switchWallet: 'Смени портфейл',
      archiveWallet: 'Архивирай портфейл',
      restoreWallet: 'Възстанови портфейл',
      deleteWallet: 'Изтрий портфейл',
      deleteConfirm: 'Сигурни ли сте, че искате да изтриете този портфейл?',
      backupReminder: 'Моля, запазете вашата фраза за възстановяване!',
      copyMnemonic: 'Копирай фраза за възстановяване',
      showMnemonic: 'Покажи фраза за възстановяване',
    },

    // Payments - Bulgarian
    payments: {
      amount: 'Сума',
      amountSats: 'Сума (сатс)',
      enterAmount: 'Въведете сума',
      description: 'Описание (незадължително)',
      invoice: 'Lightning фактура',
      pasteInvoice: 'Постави фактура',
      scanQR: 'Сканирай QR код',
      generateInvoice: 'Генерирай фактура',
      sendPayment: 'Изпрати плащане',
      paymentSent: 'Плащането е изпратено!',
      paymentReceived: 'Плащането е получено!',
      paymentFailed: 'Плащането е неуспешно',
      insufficientBalance: 'Недостатъчен баланс',
      invalidInvoice: 'Невалидна фактура',
      tip: 'Бакшиш',
      tipSent: 'Бакшишът е изпратен успешно!',
    },

    // Settings - Bulgarian
    settings: {
      title: 'Настройки',
      language: 'Език',
      english: 'Английски',
      bulgarian: 'Български',
      currency: 'Валута',
      security: 'Сигурност',
      biometric: 'Биометрична автентикация',
      autoLockTimeout: 'Време за автоматично заключване',
      changePin: 'Смяна на ПИН',
      notifications: 'Известия',
      about: 'За приложението',
      version: 'Версия',
      privacyPolicy: 'Политика за поверителност',
      termsOfService: 'Условия за ползване',
      logout: 'Изход',
    },

    // Onboarding - Bulgarian
    onboarding: {
      welcome: 'Добре дошли в Zap Arc',
      subtitle: 'Вашият Lightning Network портфейл',
      getStarted: 'Започнете',
      createNew: 'Създай нов портфейл',
      importExisting: 'Импортирай съществуващ портфейл',
      locationPermission: 'Достъпът до местоположение ни помага да предоставим по-добро изживяване',
      allowLocation: 'Разреши местоположение',
      skipLocation: 'Пропусни засега',
    },

    // Errors - Bulgarian
    errors: {
      networkError: 'Мрежова грешка. Проверете връзката си.',
      unknownError: 'Възникна неизвестна грешка. Опитайте отново.',
      sessionExpired: 'Сесията ви е изтекла. Отключете отново.',
      walletNotFound: 'Портфейлът не е намерен.',
    },
  },
};

// =============================================================================
// i18n Service
// =============================================================================

class I18nService {
  private currentLanguage: SupportedLanguage = 'en';
  private isInitialized = false;
  private isManualOverride = false;

  /**
   * Initialize the i18n service
   * Detects language based on location or saved preference
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🌐 [i18n] Initializing...');

      // Check for saved language preference
      const settings = await settingsService.getUserSettings();
      
      if (settings.language && settings.language !== 'auto') {
        // Manual override exists
        this.currentLanguage = settings.language as SupportedLanguage;
        this.isManualOverride = true;
        console.log('🌐 [i18n] Using saved language:', this.currentLanguage);
      } else {
        // Try to detect from location
        const location = await locationService.getCurrentLocation();
        
        if (location?.isInBulgaria) {
          this.currentLanguage = 'bg';
          console.log('🌐 [i18n] Detected Bulgaria, using Bulgarian');
        } else {
          this.currentLanguage = 'en';
          console.log('🌐 [i18n] Using default English');
        }
      }

      this.isInitialized = true;
      console.log('✅ [i18n] Initialized with language:', this.currentLanguage);
    } catch (error) {
      console.error('❌ [i18n] Initialization failed:', error);
      this.currentLanguage = 'en';
      this.isInitialized = true;
    }
  }

  /**
   * Get the current language
   */
  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Check if current language was set manually
   */
  isManuallySet(): boolean {
    return this.isManualOverride;
  }

  /**
   * Set language manually (persists to settings)
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    this.currentLanguage = language;
    this.isManualOverride = true;

    // Persist to settings
    await settingsService.updateUserSettings({ language });
    
    console.log('🌐 [i18n] Language set to:', language);
  }

  /**
   * Reset to auto-detect mode
   */
  async resetToAuto(): Promise<void> {
    this.isManualOverride = false;
    await settingsService.updateUserSettings({ language: 'auto' });

    // Re-detect from location
    const location = await locationService.getCurrentLocation();
    this.currentLanguage = location?.isInBulgaria ? 'bg' : 'en';

    console.log('🌐 [i18n] Reset to auto, detected:', this.currentLanguage);
  }

  /**
   * Get a translated string by key path
   * Examples: 'common.loading', 'wallet.balance', 'auth.enterPin'
   */
  t(keyPath: string, params?: TranslationParams): string {
    const keys = keyPath.split('.');
    let value: TranslationValue = translations[this.currentLanguage];

    for (const key of keys) {
      if (typeof value === 'object' && value !== null && key in value) {
        value = value[key];
      } else {
        // Fall back to English if key not found
        value = translations.en;
        for (const fallbackKey of keys) {
          if (typeof value === 'object' && value !== null && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            console.warn(`🌐 [i18n] Translation not found: ${keyPath}`);
            return keyPath; // Return key path as fallback
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`🌐 [i18n] Translation is not a string: ${keyPath}`);
      return keyPath;
    }

    // Handle string interpolation
    if (params) {
      return this.interpolate(value, params);
    }

    return value;
  }

  /**
   * Interpolate parameters into a translation string
   * Example: 'Hello, {{name}}!' with { name: 'John' } -> 'Hello, John!'
   */
  private interpolate(template: string, params: TranslationParams): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return params[key]?.toString() ?? `{{${key}}}`;
    });
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): Array<{ code: SupportedLanguage; name: string; nativeName: string }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
    ];
  }
}

// Export singleton instance
export const i18n = new I18nService();

// Export class for testing
export { I18nService };

// Convenience function for translation
export const t = (keyPath: string, params?: TranslationParams): string => {
  return i18n.t(keyPath, params);
};
