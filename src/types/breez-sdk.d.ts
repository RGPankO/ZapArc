// Type declarations for @breeztech/breez-sdk-spark

declare module '@breeztech/breez-sdk-spark' {
  export default function init(): Promise<void>;
  
  export interface Config {
    network: string;
    apiKey?: string;
  }
  
  export interface Seed {
    type: 'mnemonic' | 'random';
    mnemonic?: string;
  }
  
  export interface ConnectRequest {
    config: Config;
    seed: Seed;
    storageDir: string;
  }
  
  export interface NodeInfo {
    channelsBalanceSats?: number;
    id: string;
  }
  
  export interface ReceivePaymentRequest {
    amountSats: number;
    description: string;
  }
  
  export interface ReceivePaymentResponse {
    bolt11: string;
  }
  
  export interface SendPaymentRequest {
    bolt11: string;
  }
  
  export interface Payment {
    id: string;
    paymentType: 'sent' | 'received';
    amountSats: number;
    description?: string;
    paymentTime: number;
    status: string;
  }
  
  export interface LnUrlPayRequest {
    reqData: any;
    amountSats: number;
    comment?: string;
  }
  
  export interface LnUrlPayData {
    lnurl: string;
  }
  
  export interface BreezSDK {
    nodeInfo(): Promise<NodeInfo>;
    receivePayment(req: ReceivePaymentRequest): Promise<ReceivePaymentResponse>;
    sendPayment(req: SendPaymentRequest): Promise<void>;
    listPayments(): Promise<Payment[]>;
    parseLnurl(lnurl: string): Promise<any>;
    payLnurl(req: LnUrlPayRequest): Promise<void>;
    receiveLnurlPay(): Promise<LnUrlPayData>;
    disconnect(): Promise<void>;
  }
  
  export function connect(req: ConnectRequest): Promise<BreezSDK>;
  export function defaultConfig(network: string): Config;
}