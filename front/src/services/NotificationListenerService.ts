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
  '$',
  'cop',
];

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
  const combinedText = extractNotificationText(data).toLowerCase();
  if (!combinedText) return false;

  return BANK_KEYWORDS.some((kw) => combinedText.includes(kw));
};

export const handleNotificationReceived = async (data: any): Promise<void> => {
  console.log('🔔 [ANDROID NOTIFICATION RECEIVED RAW]:', JSON.stringify(data));
  try {
    const notificationText = extractNotificationText(data);

    if (!notificationText || !isBankNotification(data)) {
      console.log('ℹ️ Notification skipped (not matched as bank alert)');
      return;
    }

    console.log('🤖 Bank notification intercepted successfully:', notificationText);
    const result = await api.simulateBankWebhook(notificationText);
    console.log('✅ Webhook transaction created:', JSON.stringify(result));
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
