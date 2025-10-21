// Type declarations for @breeztech/breez-sdk-spark

declare module '@breeztech/breez-sdk-spark' {
  export default function init(): Promise<void>;

  export interface Config {
    network: string;
    apiKey?: string;
    syncIntervalSecs?: number;
    maxDepositClaimFee?: any;
    lnurlDomain?: string;
  }

  export interface ConnectRequest {
    config: Config;
    mnemonic: string;
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

  export interface PrepareSendPaymentRequest {
    paymentRequest: string;
    amountSats?: number;
  }

  export interface PrepareResponse {
    amount_sats?: number;
    fees_sats?: number;
    [key: string]: any; // Allow other properties
  }

  export interface SendPaymentOptions {
    type?: 'bolt11Invoice' | 'bitcoinAddress' | 'sparkAddress';
    preferSpark?: boolean;
    completionTimeoutSecs?: number;
    confirmationSpeed?: 'slow' | 'medium' | 'fast';
  }

  export interface SendPaymentRequest {
    prepareResponse: PrepareResponse;
    options?: SendPaymentOptions;
  }

  export interface ListPaymentsRequest {
    filters?: any[];
    fromTimestamp?: number;
    toTimestamp?: number;
    includeFailures?: boolean;
  }

  export interface ListPaymentsResponse {
    [index: number]: Payment;
    length: number;
    find(predicate: (payment: Payment) => boolean): Payment | undefined;
  }

  export interface Payment {
    id: string;
    // CRITICAL: Breez SDK Spark uses 'receive' and 'send', NOT 'received' and 'sent'
    paymentType: 'send' | 'receive';
    amountSats: number;
    amount?: number; // Alternative property name
    description?: string;
    paymentTime: number;
    timestamp?: number; // Alternative property name
    status: string;
    fees?: number;
    method?: string;
    details?: {
      bolt11?: string;
      invoice?: string;
      type?: string;
      preimage?: string;
      paymentHash?: string;
      destinationPubkey?: string;
    };
  }

  export interface LnUrlPayRequest {
    reqData: any;
    amountSats: number;
    comment?: string;
  }

  export interface LnUrlPayData {
    lnurl: string;
  }

  export interface BreezSdk {
    nodeInfo(): Promise<NodeInfo>;
    receivePayment(req: ReceivePaymentRequest): Promise<ReceivePaymentResponse>;
    sendPayment(req: SendPaymentRequest): Promise<void>;
    listPayments(req?: ListPaymentsRequest): Promise<ListPaymentsResponse>;
    parseLnurl(lnurl: string): Promise<any>;
    payLnurl(req: LnUrlPayRequest): Promise<void>;
    receiveLnurlPay(): Promise<LnUrlPayData>;
    disconnect(): Promise<void>;
  }

  export function connect(req: ConnectRequest): Promise<BreezSdk>;
  export function defaultConfig(network: string): Config;
}

// Type declarations for @breeztech/breez-sdk-spark/web
declare module '@breeztech/breez-sdk-spark/web' {
  export default function init(): Promise<void>;

  export interface Config {
    network: string;
    apiKey?: string;
    syncIntervalSecs?: number;
    maxDepositClaimFee?: any;
    lnurlDomain?: string;
  }

  export interface ConnectRequest {
    config: Config;
    mnemonic: string;
    storageDir: string;
  }

  export interface NodeInfo {
    channelsBalanceSats?: number;
    channelsBalanceMsat?: number;
    id: string;
  }

  export interface ReceivePaymentRequest {
    paymentMethod: {
      type: 'bolt11Invoice';
      description: string;
      amountSats: number;
    };
  }

  export interface ReceivePaymentResponse {
    paymentRequest: string;
    feeSats?: number;
  }

  export interface PrepareSendPaymentRequest {
    paymentRequest: string;
    amountSats?: number;
  }

  export interface PrepareResponse {
    amount_sats?: number;
    fees_sats?: number;
    [key: string]: any; // Allow other properties
  }

  export interface SendPaymentOptions {
    type?: 'bolt11Invoice' | 'bitcoinAddress' | 'sparkAddress';
    preferSpark?: boolean;
    completionTimeoutSecs?: number;
    confirmationSpeed?: 'slow' | 'medium' | 'fast';
  }

  export interface SendPaymentRequest {
    prepareResponse: PrepareResponse;
    options?: SendPaymentOptions;
  }

  export interface GetInfoRequest {
    ensureSynced?: boolean;
  }

  export interface GetInfoResponse {
    balanceSats?: number;
    [key: string]: any;
  }

  export interface Payment {
    id: string;
    // CRITICAL: Breez SDK Spark uses 'receive' and 'send', NOT 'received' and 'sent'
    paymentType: 'send' | 'receive';
    amountSats: number;
    amount?: number; // Alternative property name
    description?: string;
    paymentTime: number;
    timestamp?: number; // Alternative property name
    status: string;
    fees?: number;
    method?: string;
    details?: {
      bolt11?: string;
      invoice?: string;
      type?: string;
      preimage?: string;
      paymentHash?: string;
      destinationPubkey?: string;
    };
  }

  export interface LnUrlPayRequest {
    reqData: any;
    amountSats: number;
    comment?: string;
  }

  export interface LnUrlPayData {
    lnurl: string;
  }

  // LNURL Pay Request Details (returned from parse() for Lightning addresses)
  export interface LnurlPayRequestDetails {
    callback: string;
    minSendable: number;
    maxSendable: number;
    metadataStr: string;
    commentAllowed: number;
    domain: string;
    url: string;
    address?: string;
    allowsNostr?: boolean;
    nostrPubkey?: string;
  }

  // Lightning Address Details
  export interface LightningAddressDetails {
    address: string;
    payRequest: LnurlPayRequestDetails;
  }

  // Input types returned by parse()
  export type InputType =
    | ({ type: "bitcoinAddress" } & any)
    | ({ type: "bolt11Invoice" } & any)
    | ({ type: "lightningAddress" } & LightningAddressDetails)
    | ({ type: "lnurlPay" } & LnurlPayRequestDetails)
    | ({ type: "lnurlAuth" } & any)
    | ({ type: "url" } & string)
    | ({ type: "bip21" } & any)
    | ({ type: "lnurlWithdraw" } & any)
    | ({ type: "sparkAddress" } & any);

  // Prepare LNURL Pay Request
  export interface PrepareLnurlPayRequest {
    amountSats: number;
    comment?: string;
    payRequest: LnurlPayRequestDetails;
    validateSuccessActionUrl?: boolean;
  }

  // Bolt11 Invoice Details
  export interface Bolt11InvoiceDetails {
    amount?: number;
    description?: string;
    paymentHash?: string;
    timestamp?: number;
    expiresAt?: number;
    [key: string]: any;
  }

  // Success Action Types
  export interface MessageSuccessActionData {
    message: string;
  }

  export interface UrlSuccessActionData {
    description: string;
    url: string;
    matchesCallbackDomain: boolean;
  }

  export interface AesSuccessActionData {
    description: string;
    ciphertext: string;
    iv: string;
  }

  export type SuccessAction =
    | { type: "message"; data: MessageSuccessActionData }
    | { type: "url"; data: UrlSuccessActionData }
    | { type: "aes"; data: AesSuccessActionData };

  export type SuccessActionProcessed =
    | { type: "message"; data: MessageSuccessActionData }
    | { type: "url"; data: UrlSuccessActionData }
    | { type: "aes"; result: any };

  // Prepare LNURL Pay Response
  export interface PrepareLnurlPayResponse {
    amountSats: number;
    comment?: string;
    payRequest: LnurlPayRequestDetails;
    feeSats: number;
    invoiceDetails: Bolt11InvoiceDetails;
    successAction?: SuccessAction;
  }

  // LNURL Pay Request (for actual payment execution)
  export interface LnurlPayRequestNew {
    prepareResponse: PrepareLnurlPayResponse;
  }

  // LNURL Pay Response
  export interface LnurlPayResponse {
    payment: Payment;
    successAction?: SuccessActionProcessed;
  }

  export interface ListPaymentsRequest {
    offset?: number;
    limit?: number;
  }

  export interface ListPaymentsResponse {
    payments: Payment[];
  }

  export interface EventListener {
    onEvent: (e: SdkEvent) => void;
  }

  export type SdkEvent = { type: "synced" } | { type: "claimDepositsFailed" } | { type: "claimDepositsSucceeded" } | { type: "paymentSucceeded" };

  export interface BreezSdk {
    nodeInfo(): Promise<NodeInfo>;
    getInfo(req: GetInfoRequest): Promise<GetInfoResponse>;
    receivePayment(req: ReceivePaymentRequest): Promise<ReceivePaymentResponse>;
    prepareSendPayment(req: PrepareSendPaymentRequest): Promise<PrepareResponse>;
    sendPayment(req: SendPaymentRequest): Promise<void>;
    listPayments(req?: ListPaymentsRequest): Promise<ListPaymentsResponse>;
    parse(input: string): Promise<InputType>;
    parseLnurl(lnurl: string): Promise<any>; // Legacy, use parse() instead
    payLnurl(req: LnUrlPayRequest): Promise<void>;
    prepareLnurlPay(req: PrepareLnurlPayRequest): Promise<PrepareLnurlPayResponse>;
    lnurlPay(req: LnurlPayRequestNew): Promise<LnurlPayResponse>;
    receiveLnurlPay(): Promise<LnUrlPayData>;
    addEventListener(listener: EventListener): string;
    removeEventListener(id: string): boolean;
    disconnect(): Promise<void>;
  }

  export function connect(req: ConnectRequest): Promise<BreezSdk>;
  export function defaultConfig(network: string): Config;
}
