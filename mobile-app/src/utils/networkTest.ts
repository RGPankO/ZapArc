import { NetworkConfig } from '../config/network';

export async function testNetworkConnectivity(): Promise<{
  results: Array<{
    url: string;
    success: boolean;
    error?: string;
    responseTime?: number;
  }>;
  workingUrl?: string;
}> {
  const urls = NetworkConfig.getApiBaseUrls();
  const results = [];
  let workingUrl: string | undefined;

  console.log('NetworkTest: Testing connectivity to all URLs...');

  for (const baseUrl of urls) {
    const healthUrl = baseUrl.replace('/api', '/health');
    const startTime = Date.now();
    
    try {
      console.log(`NetworkTest: Testing ${healthUrl}...`);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      const success = response.ok || response.status === 503; // Accept both healthy and unhealthy but running
      
      results.push({
        url: healthUrl,
        success,
        responseTime,
      });
      
      if (success && !workingUrl) {
        workingUrl = baseUrl;
        console.log(`✅ NetworkTest: Found working URL: ${baseUrl}`);
      }
      
      console.log(`NetworkTest: ${healthUrl} - Status: ${response.status}, Time: ${responseTime}ms`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      results.push({
        url: healthUrl,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      });
      
      console.log(`❌ NetworkTest: ${healthUrl} failed - ${error}`);
    }
  }

  return { results, workingUrl };
}

export async function quickConnectivityTest(): Promise<boolean> {
  try {
    const result = await testNetworkConnectivity();
    return !!result.workingUrl;
  } catch (error) {
    console.error('NetworkTest: Quick test failed:', error);
    return false;
  }
}