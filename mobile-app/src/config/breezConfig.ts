// Breez SDK Configuration
// API key for Breez SDK Spark (Nodeless)

// NOTE: The Breez SDK Spark requires a DIFFERENT API key format than the old Greenlight SDK.
// The old certificate-based key won't work. You need to request a new Spark API key from:
// https://breez.technology/request-api-key/#contact-us-form-sdk (select Nodeless/Spark)

// Old Greenlight certificate (NOT compatible with Spark):
// export const BREEZ_API_KEY = 'MIIBfjCCATCgAwIBAgIHPoqCRCUxZzAFBgMrZXAwEDEOMAwGA1UEAxMFQnJlZXowHhcNMjUxMDEzMTY0NzQ0WhcNMzUxMDExMTY0NzQ0WjAwMRUwEwYDVQQKEwxCVEMgSE9ETCBMdGQxFzAVBgNVBAMTDlBsYW1lbiBBbmRvbm92MCowBQYDK2VwAyEA0IP1y98gPByiIMoph1P0G6cctLb864rNXw1LRLOpXXejgYgwgYUwDgYDVR0PAQH/BAQDAgWgMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFNo5o+5ea0sNMlW/75VgGJCv2AcJMB8GA1UdIwQYMBaAFN6q1pJW843ndJIW/Ey2ILJrKJhrMCUGA1UdEQQeMByBGnBsYW1lbkBjcnlwdG9yZXZvbHV0aW9uLmJnMAUGAytlcANBAOxPxCDCzt/batCHrDuIMNsZL0lqBpk/dG+MzqseJRS8UjhJsSpOO4jTtsMqS7DWJE64THyIV+FTCbt1XhUM2A4=';

// TODO: Replace with your Spark API key once you receive it from Breez
// For now, leaving empty - SDK may work in limited capacity without it
export const BREEZ_API_KEY = 'MIIBZDCCARagAwIBAgIHPs+tNXy+rTAFBgMrZXAwEDEOMAwGA1UEAxMFQnJlZXowHhcNMjYwMTA5MTcxODU4WhcNMzYwMTA3MTcxODU4WjAhMQswCQYDVQQKEwJCRDESMBAGA1UEAxMJQm9yaXNsYXYgMCowBQYDK2VwAyEA0IP1y98gPByiIMoph1P0G6cctLb864rNXw1LRLOpXXejfjB8MA4GA1UdDwEB/wQEAwIFoDAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBTaOaPuXmtLDTJVv++VYBiQr9gHCTAfBgNVHSMEGDAWgBTeqtaSVvON53SSFvxMtiCyayiYazAcBgNVHREEFTATgRF3NG50M2QyQGdtYWlsLmNvbTAFBgMrZXADQQA3NLkVKVUNvS2i3rsdLB87axVFSkHaSrnH8T84IoR01Tah30In8H/Q09VAbRepUrpvqVIEOZik3yIJ7ARlHPsF';

// Network configuration
export const BREEZ_NETWORK = 'mainnet' as const;

// Storage directory name for Breez SDK data
export const BREEZ_STORAGE_DIR = 'breezSdkSpark';
