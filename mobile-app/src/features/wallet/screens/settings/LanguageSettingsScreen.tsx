// Language Settings Screen
// Configure app language and location-based detection

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, RadioButton, Switch, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../../../../hooks/useSettings';
import { useLanguage } from '../../../../hooks/useLanguage';

// =============================================================================
// Component
// =============================================================================

export function LanguageSettingsScreen(): React.JSX.Element {
  const { settings, updateSettings } = useSettings();
  const { t } = useLanguage();

  // State
  const [language, setLanguage] = useState<'en' | 'bg' | 'auto'>('auto');
  const [isLocationBased, setIsLocationBased] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (settings) {
      setLanguage(settings.language || 'auto');
      setIsLocationBased(settings.isLocationBased ?? true);
    }
  }, [settings]);

  // Handle save
  const handleSave = async (): Promise<void> => {
    setIsSaving(true);

    try {
      await updateSettings({
        language,
        isLocationBased,
      });

      Alert.alert('Saved', 'Language settings updated', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            iconColor="#FFFFFF"
            size={24}
            onPress={() => router.back()}
          />
          <Text style={styles.headerTitle}>{t('language')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            {/* Language Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Language</Text>

              <RadioButton.Group
                onValueChange={(value) =>
                  setLanguage(value as 'en' | 'bg' | 'auto')
                }
                value={language}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="auto"
                    color="#FFC107"
                    uncheckedColor="rgba(255, 255, 255, 0.5)"
                  />
                  <View style={styles.radioContent}>
                    <Text style={styles.radioTitle}>
                      Automatic (Location-based)
                    </Text>
                    <Text style={styles.radioDescription}>
                      Detect language based on your location. Bulgarian in
                      Bulgaria, English elsewhere.
                    </Text>
                  </View>
                </View>

                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="en"
                    color="#FFC107"
                    uncheckedColor="rgba(255, 255, 255, 0.5)"
                  />
                  <View style={styles.radioContent}>
                    <View style={styles.radioTitleRow}>
                      <Text style={styles.radioTitle}>English</Text>
                      <Text style={styles.flag}>🇬🇧</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="bg"
                    color="#FFC107"
                    uncheckedColor="rgba(255, 255, 255, 0.5)"
                  />
                  <View style={styles.radioContent}>
                    <View style={styles.radioTitleRow}>
                      <Text style={styles.radioTitle}>Български</Text>
                      <Text style={styles.flag}>🇧🇬</Text>
                    </View>
                  </View>
                </View>
              </RadioButton.Group>
            </View>

            {/* Location Settings */}
            {language === 'auto' && (
              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <View style={styles.switchContent}>
                    <Text style={styles.switchTitle}>
                      Location-based Detection
                    </Text>
                    <Text style={styles.switchDescription}>
                      Use GPS to detect if you're in Bulgaria
                    </Text>
                  </View>
                  <Switch
                    value={isLocationBased}
                    onValueChange={setIsLocationBased}
                    color="#FFC107"
                  />
                </View>
              </View>
            )}

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>About Language Detection</Text>
              <Text style={styles.infoText}>
                When automatic mode is enabled, the app will use your device
                location to determine the appropriate language. If you're
                located within Bulgaria, Bulgarian will be used. Otherwise,
                English will be the default.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
          >
            Save Changes
          </Button>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  radioContent: {
    flex: 1,
    marginLeft: 8,
  },
  radioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  flag: {
    fontSize: 20,
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFC107',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
  },
  saveButton: {
    backgroundColor: '#FFC107',
    borderRadius: 12,
  },
  saveButtonLabel: {
    color: '#1a1a2e',
    fontWeight: '600',
  },
});
