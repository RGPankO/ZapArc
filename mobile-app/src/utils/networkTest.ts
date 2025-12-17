import { NetworkConfig } from '../config/network';

export async function testNetworkConnectivity(): Promise<{
  url: string;
  success: boolean;
  error?: string;
  responseTime?: number;
}> {
  const baseUrl = NetworkConfig.getApiBaseUrl();
  const healthUrl = baseUrl.replace('/api', '/health');
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const success = response.ok || response.status === 503;

    return {
      url: healthUrl,
      success,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      url: healthUrl,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    };
  }
}

export async function quickConnectivityTest(): Promise<boolean> {
  try {
    const result = await testNetworkConnectivity();
    return result.success;
  } catch {
    return false;
  }
}
