import { BackHandler, Platform } from 'react-native';

/** Fecha o aplicativo (Android). No iOS o sistema pode ignorar. */
export function exitApp(): void {
  if (Platform.OS === 'android') {
    BackHandler.exitApp();
  } else {
    BackHandler.exitApp();
  }
}
