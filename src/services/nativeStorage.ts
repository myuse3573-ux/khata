import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSession } from '../types';

const ACCESS_TOKEN_KEY = 'khata_access_token';
const REFRESH_TOKEN_KEY = 'khata_refresh_token';
const PIN_SECRET_KEY = 'khata_pin_secret';
const USER_DATA_KEY = 'khata_user_data';
const PREF_LANGUAGE_KEY = 'khata_pref_lang';
const PREF_THEME_KEY = 'khata_pref_theme';

/**
 * Native Storage Service
 * Encrypted SecureStore for sensitive credentials, AsyncStorage for non-sensitive UI settings
 */
export const NativeStorage = {
  // ─── SECURE STORAGE (Access Token, Refresh Token, PIN Secret) ───────────────

  async saveSession(session: UserSession): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(session.user));
    } catch (err) {
      console.error('Failed to save session securely:', err);
    }
  },

  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async savePinSecret(pin: string): Promise<void> {
    try {
      if (!pin) {
        await SecureStore.deleteItemAsync(PIN_SECRET_KEY);
      } else {
        await SecureStore.setItemAsync(PIN_SECRET_KEY, pin);
      }
    } catch (err) {
      console.error('Failed to save PIN secret:', err);
    }
  },

  async getPinSecret(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(PIN_SECRET_KEY);
    } catch {
      return null;
    }
  },

  /** Full logout scope reset — wipes secure tokens & user credentials */
  async clearSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(PIN_SECRET_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  },

  // ─── ASYNC STORAGE (Non-sensitive UI Preferences) ──────────────────────────

  async getLanguage(): Promise<'en' | 'hi'> {
    try {
      const lang = await AsyncStorage.getItem(PREF_LANGUAGE_KEY);
      return (lang === 'hi' ? 'hi' : 'en');
    } catch {
      return 'en';
    }
  },

  async setLanguage(lang: 'en' | 'hi'): Promise<void> {
    try {
      await AsyncStorage.setItem(PREF_LANGUAGE_KEY, lang);
    } catch (err) {
      console.error('Failed to save language preference:', err);
    }
  },

  async getTheme(): Promise<'light' | 'dark'> {
    try {
      const theme = await AsyncStorage.getItem(PREF_THEME_KEY);
      return (theme === 'light' ? 'light' : 'dark');
    } catch {
      return 'dark';
    }
  },

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    try {
      await AsyncStorage.setItem(PREF_THEME_KEY, theme);
    } catch (err) {
      console.error('Failed to save theme preference:', err);
    }
  }
};
