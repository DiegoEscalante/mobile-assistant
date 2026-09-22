import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, CheckCircle2, AlertCircle, RefreshCw, Globe } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { getServerUrl, setServerUrl, DEFAULT_SERVER_URL } from '../api/config';
import { api } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onServerConfigChanged: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  visible,
  onClose,
  onServerConfigChanged,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [urlInput, setUrlInput] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      getServerUrl().then((url) => {
        setUrlInput(url);
        setTestResult(null);
      });
    }
  }, [visible]);

  const handleTestConnection = async () => {
    if (!urlInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      await setServerUrl(urlInput.trim());
      const isOk = await api.checkHealth();
      if (isOk) {
        setTestResult({ success: true, message: t('connectedSuccess') });
      } else {
        setTestResult({
          success: false,
          message: t('unreachableError'),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || t('unreachableError'),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!urlInput.trim()) {
      Alert.alert(t('validationError'), t('enterValidUrl'));
      return;
    }
    await setServerUrl(urlInput.trim());
    onServerConfigChanged();
    onClose();
  };

  const handleResetDefault = () => {
    setUrlInput(DEFAULT_SERVER_URL);
    setTestResult(null);
  };

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subtitle}>{t('settingsSubtitle')}</Text>
              <Text style={styles.title}>{t('settingsTitle')}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {/* Language Selector Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Globe size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.label}>{t('languageLabel')}</Text>
              </View>
              <View style={styles.languageOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.languageChip,
                    language === 'es' && styles.languageChipSelected,
                  ]}
                  onPress={() => handleSelectLanguage('es')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.languageChipText,
                      language === 'es' && styles.languageChipTextSelected,
                    ]}
                  >
                    {t('langSpanish')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.languageChip,
                    language === 'en' && styles.languageChipSelected,
                  ]}
                  onPress={() => handleSelectLanguage('en')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.languageChipText,
                      language === 'en' && styles.languageChipTextSelected,
                    ]}
                  >
                    {t('langEnglish')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Backend URL Section */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('backendUrlLabel')}</Text>
              <TextInput
                style={styles.input}
                value={urlInput}
                onChangeText={(text) => {
                  setUrlInput(text);
                  setTestResult(null);
                }}
                placeholder="http://100.95.186.80:8000"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <TouchableOpacity style={styles.defaultLink} onPress={handleResetDefault}>
                <Text style={styles.defaultLinkText}>{t('resetDefault')} ({DEFAULT_SERVER_URL})</Text>
              </TouchableOpacity>
            </View>

            {/* Test result message */}
            {testResult && (
              <View
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: testResult.success
                      ? colors.successLight
                      : colors.errorContainer,
                    borderColor: testResult.success ? colors.secondary : colors.error,
                  },
                ]}
              >
                {testResult.success ? (
                  <CheckCircle2 size={18} color={colors.secondaryDark} style={styles.resultIcon} />
                ) : (
                  <AlertCircle size={18} color={colors.error} style={styles.resultIcon} />
                )}
                <Text
                  style={[
                    styles.resultText,
                    { color: testResult.success ? colors.secondaryDark : colors.error },
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <>
                    <RefreshCw size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                    <Text style={styles.secondaryButtonText}>{t('testHealth')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
                <Text style={styles.primaryButtonText}>{t('saveConnection')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Newsreader_600SemiBold',
    color: colors.textPrimary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: {
    gap: 14,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textSecondary,
  },
  languageOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  languageChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  languageChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  languageChipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textSecondary,
  },
  languageChipTextSelected: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.primaryDark,
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textPrimary,
  },
  defaultLink: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  defaultLinkText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.primary,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  resultIcon: {
    marginRight: 8,
  },
  resultText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textPrimary,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.onPrimary,
  },
});
