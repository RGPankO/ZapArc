import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function Index(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Mobile App Skeleton
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Choose a section to test:
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => router.push('/auth/welcome')}
            style={styles.button}
          >
            Authentication Flow
          </Button>
          
          <Button
            mode="contained"
            onPress={() => router.push('/(main)/profile')}
            style={styles.button}
          >
            Profile Screen
          </Button>
          
          <Button
            mode="contained"
            onPress={() => router.push('/(main)/settings')}
            style={styles.button}
          >
            Settings Screen
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    borderRadius: 8,
  },
});