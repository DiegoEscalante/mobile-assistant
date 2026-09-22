import { Platform, AppRegistry } from 'react-native';
import RNAndroidNotificationListener, {
  RNAndroidNotificationListenerHeadlessJsName,
} from 'react-native-android-notification-listener';
import { api } from '../api/client';

export const BANK_KEYWORDS = [
  'bancolombia',
  'davivienda',
  'nequi',
  'daviplata',
  'nu',
  'banco',
  'compra',
  'pago',
  'transferencia',
  'recibido',
  'recibiste',
  'deposito',
  'abono',
  'tarjeta',
  'retiro',
  'transaccion',
  'salida',
  'ingreso',
  'pse',
  'mastercard',
  'visa',
  'exito',
  'rappi',
  'uber',
];

// Regex matching whole words for bank keywords (prevents 'copyright' from matching 'cop')
const FINANCIAL_KEYWORD_REGEX = new RegExp(
  `\\b(${[...BANK_KEYWORDS, 'cop', 'usd', 'eur'].join('|')})\\b`,
  'i'
);

// Regex matching explicit monetary amounts (e.g. $48.500, COP 48.500, 48500 COP, $ 5000)
const MONETARY_AMOUNT_REGEX = /(?:COP|USD|EUR|\$)\s*\d[\d.,]*|\d[\d.,]*\s*(?:COP|USD|EUR)/i;

// Regex identifying known dedicated banking/wallet apps by package name
const BANK_PACKAGE_REGEX = /bancolombia|nequi|davivienda|daviplata|nubank|banco/i;

export const checkNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    const status = await RNAndroidNotificationListener.getPermissionStatus();
    return status === 'authorized';
  } catch (err) {
    console.warn('Error checking notification listener permission:', err);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  try {
    await RNAndroidNotificationListener.requestPermission();
  } catch (err) {
    console.warn('Error requesting notification listener permission:', err);
  }
};

export const extractNotificationText = (data: any): string => {
  if (!data) return '';

  let payload = data;

  // Step 1: Parse outer payload if string
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      return payload.trim();
    }
  }

  // Step 2: Unwrap inner nested "notification" JSON string if present
  if (payload && typeof payload.notification === 'string') {
    try {
      payload = JSON.parse(payload.notification);
    } catch (e) {
      // Ignore parse failure and continue with payload as string
    }
  }

  if (typeof payload === 'string') return payload.trim();

  // Step 3: Combine app, title, text, bigText, subText
  const parts = [
    payload.app || payload.package || '',
    payload.title || '',
    payload.text || '',
    payload.bigText || '',
    payload.subText || '',
    payload.summaryText || '',
  ].filter(Boolean);

  return parts.join(' ').trim();
};

export const isBankNotification = (data: any): boolean => {
  const combinedText = extractNotificationText(data);
  if (!combinedText) return false;

  const lowerText = combinedText.toLowerCase();

  // 1. If notification is from a dedicated banking/wallet app, check for any keyword or amount
  let appName = '';
  if (data && typeof data === 'object') {
    appName = data.app || data.package || '';
  }
  if (BANK_PACKAGE_REGEX.test(appName)) {
    return FINANCIAL_KEYWORD_REGEX.test(lowerText) || MONETARY_AMOUNT_REGEX.test(combinedText);
  }

  // 2. For generic apps (e.g. Gmail com.google.android.gm, SMS, etc.):
  // Require BOTH a standalone financial keyword AND a monetary amount pattern ($45.000, COP 20.000, etc.)
  const hasKeyword = FINANCIAL_KEYWORD_REGEX.test(lowerText);
  const hasAmount = MONETARY_AMOUNT_REGEX.test(combinedText);

  return hasKeyword && hasAmount;
};

const recentNotificationsCache = new Map<string, number>();
const DUP_WINDOW_MS = 15000; // 15 seconds deduplication window

const isDuplicateNotification = (text: string): boolean => {
  const now = Date.now();
  // Clean up expired cache entries
  for (const [key, timestamp] of recentNotificationsCache.entries()) {
    if (now - timestamp > DUP_WINDOW_MS) {
      recentNotificationsCache.delete(key);
    }
  }

  const key = text.trim().slice(0, 150);
  if (recentNotificationsCache.has(key)) {
    return true;
  }

  recentNotificationsCache.set(key, now);
  return false;
};

export const handleNotificationReceived = async (data: any): Promise<void> => {
  console.log('🔔 [ANDROID NOTIFICATION RECEIVED RAW]:', JSON.stringify(data));
  try {
    const notificationText = extractNotificationText(data);

    if (!notificationText || !isBankNotification(data)) {
      console.log('ℹ️ Notification skipped (not matched as bank alert)');
      return;
    }

    if (isDuplicateNotification(notificationText)) {
      console.log('⚠️ Duplicate notification ignored (within 15s window)');
      return;
    }

    console.log('🤖 Bank notification intercepted successfully:', notificationText);
    const result: any = await api.simulateBankWebhook(notificationText);
    if (result?.status === 'duplicate_ignored') {
      console.log('ℹ️ Webhook transaction already recorded (duplicate skipped):', JSON.stringify(result));
    } else {
      console.log('✅ Webhook transaction created successfully:', JSON.stringify(result));
    }
  } catch (err: any) {
    console.error('❌ Error processing bank notification webhook:', err.message || err);
  }
};

// Register background Headless JS task for Android using exact RNAndroidNotificationListenerHeadlessJs key
export const registerNotificationHeadlessTask = (): void => {
  if (Platform.OS === 'android') {
    AppRegistry.registerHeadlessTask(
      RNAndroidNotificationListenerHeadlessJsName || 'RNAndroidNotificationListenerHeadlessJs',
      () => async (data) => {
        await handleNotificationReceived(data);
      }
    );
  }
};
