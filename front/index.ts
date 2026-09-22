import { registerRootComponent } from 'expo';
import App from './App';
import { registerNotificationHeadlessTask } from './src/services/NotificationListenerService';

// Register background notification listener headless task for Android zero-friction ingestion
registerNotificationHeadlessTask();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
