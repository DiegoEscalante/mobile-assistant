import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_SERVER_URL = 'http://100.95.186.80:8000';
const SERVER_URL_KEY = '@assistant_server_url';

export const getServerUrl = async (): Promise<string> => {
  try {
    const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (savedUrl && savedUrl.trim().length > 0) {
      return savedUrl.trim().replace(/\/+$/, '');
    }
  } catch (error) {
    console.warn('Error reading server URL from AsyncStorage:', error);
  }
  return DEFAULT_SERVER_URL;
};

export const setServerUrl = async (url: string): Promise<void> => {
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(SERVER_URL_KEY, cleanUrl);
  } catch (error) {
    console.error('Error saving server URL to AsyncStorage:', error);
  }
};
