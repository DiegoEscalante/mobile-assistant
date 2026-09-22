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
import { X, Send, CheckCircle2, ShieldCheck, ShieldAlert, BellRing } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '../services/NotificationListenerService';

interface BankWebhookModalProps {
  visible: boolean;
  onClose: () => void;
  onProcessed: () => void;
}

export const BankWebhookModal: React.FC<BankWebhookModalProps> = ({
  visible,
  onClose,
  onProcessed,
}) => {
  const { t } = useLanguage();
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    if (visible && Platform.OS === 'android') {
      checkNotificationPermission().then(setHasPermission);
    }
  }, [visible]);

  const handleGrantPermission = async () => {
    await requestNotificationPermission();
    // Re-check after returning from settings
    setTimeout(async () => {
      const isGranted = await checkNotificationPermission();
      setHasPermission(isGranted);
    }, 1500);
  };

  const sampleNotifications = [
    'Bancolombia le informa compra por $45.000 en EXITO SAN MARTIN 12:40.',
    'Bancolombia: Transferencia recibida por $150,000 COP de Carlos Gomez.',
    'Davivienda: Pago por $28,900 en UBER TRIP el 20/09/2026.',
  ];

  const handleSend = async () => {
    if (!notification.trim()) {
      Alert.alert(t('validationError'), t('pasteNotificationLabel'));
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await api.simulateBankWebhook(notification.trim());
      setResult(res);
      onProcessed();
    } catch (err: any) {
      Alert.alert(t('validationError'), err.message || t('validationError'));
    } finally {
      setLoading(false);
    }
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
              <Text style={styles.subtitle}>ZERO-FRICTION BANKING</Text>
              <Text style={styles.title}>{t('modalBankWebhookTitle')}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {/* Android Notification Listener Service Card */}
            {Platform.OS === 'android' && (
              <View style={styles.listenerCard}>
                <View style={styles.listenerCardHeader}>
                  <BellRing size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.listenerCardTitle}>
                    {t('notificationListenerTitle')}
                  </Text>
                </View>

                <View style={styles.listenerStatusRow}>
                  {hasPermission ? (
                    <>
                      <ShieldCheck size={18} color={colors.secondaryDark} style={{ marginRight: 6 }} />
                      <Text style={[styles.listenerStatusText, { color: colors.secondaryDark }]}>
                        {t('notificationPermissionGranted')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={18} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.listenerStatusText, { color: colors.primaryDark }]}>
                        {t('notificationPermissionDenied')}
                      </Text>
                      <TouchableOpacity
                        style={styles.grantButton}
                        onPress={handleGrantPermission}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.grantButtonText}>{t('grantPermission')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Manual Notification Tester */}
            <Text style={styles.label}>{t('pasteNotificationLabel')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notification}
              onChangeText={(text) => {
                setNotification(text);
                setResult(null);
              }}
              placeholder={t('pastePlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />

            {/* Samples */}
            <Text style={styles.sampleLabel}>Ejemplos de prueba:</Text>
            {sampleNotifications.map((sample, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sampleChip}
                onPress={() => {
                  setNotification(sample);
                  setResult(null);
                }}
              >
                <Text style={styles.sampleText} numberOfLines={1}>
                  "{sample}"
                </Text>
              </TouchableOpacity>
            ))}

            {/* Result display */}
            {result && (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  <CheckCircle2 size={16} color={colors.secondary} />
                  <Text style={styles.resultTitle}>{t('webhookResultSuccess')}</Text>
                </View>
                <Text style={styles.resultCode}>{JSON.stringify(result, null, 2)}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSend} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Send size={16} color={colors.onPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>{t('processWebhook')}</Text>
                </>
              )}
            </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
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
    gap: 10,
  },
  listenerCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  listenerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  listenerCardTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textPrimary,
  },
  listenerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  listenerStatusText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    flex: 1,
  },
  grantButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  grantButtonText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.onPrimary,
  },
  label: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textSecondary,
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
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  sampleLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textMuted,
    marginTop: 4,
  },
  sampleChip: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sampleText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textSecondary,
  },
  resultContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  resultTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.secondaryDark,
  },
  resultCode: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.onPrimary,
  },
});
