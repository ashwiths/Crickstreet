import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detect if the application is running inside Expo Go
const isExpoGo = Constants?.executionEnvironment === 'storeClient';

let isHandlerSet = false;

/**
 * Dynamically resolves and configures the native expo-notifications library if appropriate.
 * Returns null on Web or inside Expo Go client to prevent warning/error side-effects.
 */
const getNotificationsLib = () => {
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }
  try {
    const Lib = require('expo-notifications');
    if (Lib && !isHandlerSet) {
      Lib.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      isHandlerSet = true;
    }
    return Lib;
  } catch (err) {
    console.warn('[Notifications Service] Failed to load expo-notifications:', err);
    return null;
  }
};

/**
 * Checks current notification permission status without triggering a prompt
 */
export const checkNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    return window.Notification.permission === 'granted';
  }

  if (isExpoGo) {
    console.log('[Notifications Service] checkNotificationPermissions: Bypassing inside Expo Go, returning true.');
    return true;
  }

  const Lib = getNotificationsLib();
  if (!Lib) return false;

  try {
    const { status } = await Lib.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Notifications Service] Error checking permissions:', error);
    return false;
  }
};

/**
 * Requests push notifications permissions from the operating system
 * Includes full console logging and browser fallback support
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  console.log(`[Notifications Service] requestNotificationPermissions invoked. Platform: "${Platform.OS}", isExpoGo: ${isExpoGo}`);

  // Web Browser Implementation
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[Notifications Service] This browser environment does not support desktop notifications.');
      return false;
    }

    const beforeStatus = window.Notification.permission;
    console.log(`[Notifications Service] Web browser permission status BEFORE request: "${beforeStatus}"`);

    if (beforeStatus === 'granted') {
      console.log('[Notifications Service] Web browser permission is already GRANTED.');
      return true;
    }

    if (beforeStatus !== 'denied') {
      try {
        console.log('[Notifications Service] Triggering browser window.Notification.requestPermission prompt...');
        const result = await window.Notification.requestPermission();
        console.log(`[Notifications Service] Web browser permission status AFTER request: "${result}"`);
        return result === 'granted';
      } catch (err) {
        console.error('[Notifications Service] Web permission prompt error:', err);
        return false;
      }
    }

    console.warn('[Notifications Service] Web permission is currently denied. User must change permission in address bar.');
    return false;
  }

  // Fallback inside Expo Go to avoid SDK 53/54 remote notification removal crash
  if (isExpoGo) {
    console.log('[Notifications Service] requestNotificationPermissions: Expo Go detected. Simulating successful permission grant.');
    return true;
  }

  // Native iOS & Android Development Build Implementation
  const Lib = getNotificationsLib();
  if (!Lib) return false;

  try {
    const statusBefore = await Lib.getPermissionsAsync();
    console.log('[Notifications Service] Native permission status BEFORE request:', JSON.stringify(statusBefore));

    if (statusBefore.status === 'granted') {
      console.log('[Notifications Service] Native permission is already GRANTED.');
      return true;
    }

    console.log('[Notifications Service] Triggering native OS notification permission prompt...');
    const statusAfter = await Lib.requestPermissionsAsync();
    console.log('[Notifications Service] Native permission status AFTER request:', JSON.stringify(statusAfter));

    return statusAfter.status === 'granted';
  } catch (error) {
    console.error('[Notifications Service] Native permission prompt error:', error);
    return false;
  }
};

/**
 * Triggers a local push notification immediately
 * Displays browser fallback alert on Web, native alert on iOS/Android
 */
export const triggerLocalNotification = async (title: string, body: string) => {
  console.log(`[Notifications Service] triggerLocalNotification called. Title: "${title}", Body: "${body}"`);

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log(`[Web Console Fallback] Alert: "${title}" - "${body}"`);
      return;
    }

    if (window.Notification.permission === 'granted') {
      try {
        new window.Notification(title, { body });
        console.log('[Notifications Service] Web Notification constructor spawned successfully.');
      } catch (err) {
        console.error('[Notifications Service] Error creating web Notification:', err);
      }
    } else {
      console.warn('[Notifications Service] Skip triggering web notification. Current permission:', window.Notification.permission);
    }
    return;
  }

  if (isExpoGo) {
    console.log(`[Notifications Service] Expo Go alert trigger fallback: "${title}" - "${body}"`);
    try {
      const { Alert } = require('react-native');
      Alert.alert(`🔔 ${title}`, body);
    } catch (err) {
      console.error('[Notifications Service] Error showing Expo Go Alert dialog:', err);
    }
    return;
  }

  const Lib = getNotificationsLib();
  if (!Lib) return;

  try {
    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      console.warn('[Notifications Service] Skip native trigger: Permission check returned false.');
      return;
    }

    await Lib.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Lib.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // deliver immediately
    });
    console.log('[Notifications Service] Native local notification scheduled successfully.');
  } catch (error) {
    console.error('[Notifications Service] Error scheduling native notification:', error);
  }
};
