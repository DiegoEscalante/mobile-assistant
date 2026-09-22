// ==============================================================================
// PROYECTO: Asistente Personal Inteligente Multi-Agente (Mobile Frontend)
// MÓDULO: Punto de Entrada Principal (App.tsx)
// DESCRIPCIÓN: Aplicación React Native / Expo con navegación por pestañas
//              (Voz, Asistente, Tareas, Finanzas), verificación de conexión
//              al backend FastAPI y gestión global de fuentes e i18n.
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {
  useFonts,
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  Newsreader_400Regular_Italic,
} from '@expo-google-fonts/newsreader';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Mic, MessageSquare, CheckSquare, Wallet } from 'lucide-react-native';
import { colors } from './src/theme/colors';
import { Header } from './src/components/Header';
import { ServerConfigModal } from './src/components/ServerConfigModal';
import { VoiceScreen } from './src/screens/VoiceScreen';
import { AssistantScreen } from './src/screens/AssistantScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { FinancesScreen } from './src/screens/FinancesScreen';
import { api } from './src/api/client';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';

function MainAppContent() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'voice' | 'assistant' | 'tasks' | 'finances'>('voice');
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [configModalVisible, setConfigModalVisible] = useState<boolean>(false);

  const checkConnection = useCallback(async () => {
    const ok = await api.checkHealth();
    setIsOnline(ok);
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  const getScreenTitle = () => {
    switch (activeTab) {
      case 'voice':
        return t('titleVoice');
      case 'assistant':
        return t('titleAssistant');
      case 'tasks':
        return t('titleTasks');
      case 'finances':
        return t('titleFinances');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <Header
        title={getScreenTitle()}
        subtitle={t('subtitle')}
        isOnline={isOnline}
        onOpenSettings={() => setConfigModalVisible(true)}
      />

      {/* Main Screen Body */}
      <View style={styles.content}>
        {activeTab === 'voice' && <VoiceScreen isOnline={isOnline} />}
        {activeTab === 'assistant' && <AssistantScreen isOnline={isOnline} />}
        {activeTab === 'tasks' && <TasksScreen isOnline={isOnline} />}
        {activeTab === 'finances' && <FinancesScreen isOnline={isOnline} />}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {/* Voice Tab (First tab, left of Assistant) */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('voice')}
          activeOpacity={0.7}
        >
          <Mic
            size={22}
            color={activeTab === 'voice' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'voice' && styles.navLabelActive,
            ]}
          >
            {t('voiceTab')}
          </Text>
        </TouchableOpacity>

        {/* Assistant Tab */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('assistant')}
          activeOpacity={0.7}
        >
          <MessageSquare
            size={22}
            color={activeTab === 'assistant' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'assistant' && styles.navLabelActive,
            ]}
          >
            {t('assistant')}
          </Text>
        </TouchableOpacity>

        {/* Tasks Tab */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('tasks')}
          activeOpacity={0.7}
        >
          <CheckSquare
            size={22}
            color={activeTab === 'tasks' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'tasks' && styles.navLabelActive,
            ]}
          >
            {t('tasks')}
          </Text>
        </TouchableOpacity>

        {/* Finances Tab */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('finances')}
          activeOpacity={0.7}
        >
          <Wallet
            size={22}
            color={activeTab === 'finances' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'finances' && styles.navLabelActive,
            ]}
          >
            {t('finances')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <ServerConfigModal
        visible={configModalVisible}
        onClose={() => setConfigModalVisible(false)}
        onServerConfigChanged={checkConnection}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_400Regular_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <MainAppContent />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bottomNav: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textMuted,
  },
  navLabelActive: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.primary,
  },
});
