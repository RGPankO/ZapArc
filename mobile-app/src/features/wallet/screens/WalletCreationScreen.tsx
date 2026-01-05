// Wallet Creation Screen
// Multi-step wallet creation: Generate → Backup → Verify → PIN

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button, Text, TextInput, useTheme, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { generateMnemonic, validateMnemonic } from '../../../utils/mnemonic';
import { useWallet } from '../../../hooks/useWallet';

// =============================================================================
// Types
// =============================================================================

type CreationStep = 'generate' | 'backup' | 'verify' | 'pin' | 'complete';

interface MnemonicWord {
  index: number;
  word: string;
}

// =============================================================================
// Component
// =============================================================================

export function WalletCreationScreen(): React.JSX.Element {
  const theme = useTheme();
  const { createMasterKey } = useWallet();

  // State
  const [currentStep, setCurrentStep] = useState<CreationStep>('generate');
  const [mnemonic, setMnemonic] = useState<string>('');
  const [mnemonicWords, setMnemonicWords] = useState<MnemonicWord[]>([]);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [verificationIndices, setVerificationIndices] = useState<number[]>([]);
  const [verificationAnswers, setVerificationAnswers] = useState<string[]>(['', '', '']);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);

  // Progress calculation
  const progress = useMemo(() => {
    const steps: CreationStep[] = ['generate', 'backup', 'verify', 'pin', 'complete'];
    return (steps.indexOf(currentStep) + 1) / steps.length;
  }, [currentStep]);

  // ========================================
  // Step 1: Generate Mnemonic
  // ========================================

  const handleGenerateMnemonic = useCallback(() => {
    const newMnemonic = generateMnemonic();
    setMnemonic(newMnemonic);
    
    const words = newMnemonic.split(' ').map((word, index) => ({
      index: index + 1,
      word,
    }));
    setMnemonicWords(words);
    
    // Select 3 random indices for verification
    const indices: number[] = [];
    while (indices.length < 3) {
      const randomIndex = Math.floor(Math.random() * 12);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }
    setVerificationIndices(indices.sort((a, b) => a - b));
    
    setCurrentStep('backup');
  }, []);

  // ========================================
  // Step 2: Backup Confirmation
  // ========================================

  const handleConfirmBackup = useCallback(() => {
    if (!backupConfirmed) {
      Alert.alert(
        'Confirm Backup',
        'Have you written down your recovery phrase? You will not be able to recover your wallet without it.',
        [
          { text: 'Not Yet', style: 'cancel' },
          {
            text: 'Yes, I Saved It',
            onPress: () => {
              setBackupConfirmed(true);
              setCurrentStep('verify');
            },
          },
        ]
      );
      return;
    }
    setCurrentStep('verify');
  }, [backupConfirmed]);

  // ========================================
  // Step 3: Verify Mnemonic
  // ========================================

  const verificationCorrect = useMemo(() => {
    if (verificationAnswers.some((a) => !a)) return false;
    
    return verificationIndices.every((index, i) => {
      const correct = mnemonicWords[index]?.word.toLowerCase();
      const answer = verificationAnswers[i]?.toLowerCase().trim();
      return correct === answer;
    });
  }, [verificationIndices, verificationAnswers, mnemonicWords]);

  const handleVerify = useCallback(() => {
    if (!verificationCorrect) {
      setError('Some words are incorrect. Please check your backup.');
      return;
    }
    setError(null);
    setCurrentStep('pin');
  }, [verificationCorrect]);

  // ========================================
  // Step 4: PIN Setup
  // ========================================

  const pinValid = useMemo(() => {
    return pin.length >= 6 && pin === confirmPin;
  }, [pin, confirmPin]);

  const handleCreateWallet = useCallback(async () => {
    if (!pinValid) {
      setError('PINs do not match or are too short');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await createMasterKey(pin);
      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  }, [pinValid, pin, createMasterKey]);

  // ========================================
  // Step 5: Complete
  // ========================================

  const handleComplete = useCallback(() => {
    router.replace('/wallet/home');
  }, []);

  // ========================================
  // Render Steps
  // ========================================

  const renderGenerateStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Create Your Wallet</Text>
      <Text style={styles.stepDescription}>
        We'll generate a unique 12-word recovery phrase for your wallet.
        This phrase is the only way to recover your wallet if you lose access.
      </Text>

      <View style={styles.warningBox}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningText}>
          Never share your recovery phrase with anyone. Anyone with this phrase
          can access your funds.
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={handleGenerateMnemonic}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Generate Recovery Phrase
      </Button>
    </View>
  );

  const renderBackupStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Backup Your Phrase</Text>
      <Text style={styles.stepDescription}>
        Write down these 12 words in order. Store them in a safe place.
      </Text>

      {/* Show/Hide Toggle */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowMnemonic(!showMnemonic)}
      >
        <Text style={styles.toggleButtonText}>
          {showMnemonic ? '🙈 Hide Phrase' : '👁️ Show Phrase'}
        </Text>
      </TouchableOpacity>

      {/* Mnemonic Grid */}
      <View style={styles.mnemonicGrid}>
        {mnemonicWords.map((item) => (
          <View key={item.index} style={styles.wordContainer}>
            <Text style={styles.wordIndex}>{item.index}</Text>
            <Text style={styles.wordText}>
              {showMnemonic ? item.word : '••••••'}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.checkboxRow, backupConfirmed && styles.checkboxChecked]}
        onPress={() => setBackupConfirmed(!backupConfirmed)}
      >
        <View style={styles.checkbox}>
          {backupConfirmed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>
          I have written down my recovery phrase
        </Text>
      </TouchableOpacity>

      <Button
        mode="contained"
        onPress={handleConfirmBackup}
        disabled={!backupConfirmed}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Continue
      </Button>
    </ScrollView>
  );

  const renderVerifyStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Verify Your Phrase</Text>
      <Text style={styles.stepDescription}>
        Enter the following words from your recovery phrase to confirm you've
        saved it correctly.
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.verificationInputs}>
        {verificationIndices.map((wordIndex, i) => (
          <View key={wordIndex} style={styles.verificationRow}>
            <Text style={styles.verificationLabel}>Word #{wordIndex + 1}</Text>
            <TextInput
              mode="outlined"
              value={verificationAnswers[i]}
              onChangeText={(text) => {
                const newAnswers = [...verificationAnswers];
                newAnswers[i] = text;
                setVerificationAnswers(newAnswers);
              }}
              placeholder={`Enter word ${wordIndex + 1}`}
              style={styles.verificationInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}
      </View>

      <Button
        mode="contained"
        onPress={handleVerify}
        disabled={!verificationAnswers.every((a) => a.trim())}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Verify
      </Button>
    </ScrollView>
  );

  const renderPinStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Set Your PIN</Text>
      <Text style={styles.stepDescription}>
        Create a 6-digit PIN to secure your wallet. You'll use this PIN to
        unlock the wallet.
      </Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.pinInputs}>
        <TextInput
          mode="outlined"
          label="Enter PIN"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="numeric"
          maxLength={6}
          style={styles.pinInput}
        />

        <TextInput
          mode="outlined"
          label="Confirm PIN"
          value={confirmPin}
          onChangeText={setConfirmPin}
          secureTextEntry
          keyboardType="numeric"
          maxLength={6}
          style={styles.pinInput}
        />
      </View>

      {pin.length >= 6 && confirmPin.length >= 6 && pin !== confirmPin && (
        <Text style={styles.pinMismatch}>PINs do not match</Text>
      )}

      <Button
        mode="contained"
        onPress={handleCreateWallet}
        disabled={!pinValid || isLoading}
        loading={isLoading}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Create Wallet
      </Button>
    </ScrollView>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.successIcon}>
        <Text style={styles.successEmoji}>🎉</Text>
      </View>

      <Text style={styles.stepTitle}>Wallet Created!</Text>
      <Text style={styles.stepDescription}>
        Your wallet is ready to use. You can now send and receive Bitcoin
        via the Lightning Network.
      </Text>

      <Button
        mode="contained"
        onPress={handleComplete}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Get Started
      </Button>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'generate':
        return renderGenerateStep();
      case 'backup':
        return renderBackupStep();
      case 'verify':
        return renderVerifyStep();
      case 'pin':
        return renderPinStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderGenerateStep();
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* Progress Bar */}
        {currentStep !== 'complete' && (
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={progress}
              color="#FFC107"
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>
              Step {['generate', 'backup', 'verify', 'pin'].indexOf(currentStep) + 1} of 4
            </Text>
          </View>
        )}

        {/* Content */}
        {renderCurrentStep()}

        {/* Back Button (except on first and last step) */}
        {currentStep !== 'generate' && currentStep !== 'complete' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              const steps: CreationStep[] = ['generate', 'backup', 'verify', 'pin'];
              const currentIndex = steps.indexOf(currentStep);
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1]);
              }
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  progressContainer: {
    padding: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  stepContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#FFC107',
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#FFC107',
    marginTop: 24,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  toggleButton: {
    alignSelf: 'center',
    padding: 12,
    marginBottom: 16,
  },
  toggleButtonText: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: '600',
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  wordContainer: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordIndex: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginRight: 8,
    minWidth: 20,
  },
  wordText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 16,
  },
  checkboxChecked: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
  },
  verificationInputs: {
    gap: 16,
    marginBottom: 24,
  },
  verificationRow: {
    gap: 8,
  },
  verificationLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  verificationInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pinInputs: {
    gap: 16,
    marginBottom: 24,
  },
  pinInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pinMismatch: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  successIcon: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 48,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    padding: 8,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
});
