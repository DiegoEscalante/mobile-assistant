import React, { useState } from 'react';
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
import { X, CreditCard, DollarSign } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

interface CreateAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onAccountCreated: () => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  visible,
  onClose,
  onAccountCreated,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('bank_account');
  const [currency, setCurrency] = useState('COP');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setAccountType('bank_account');
    setCurrency('COP');
    setBalance('');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(t('validationError'), t('accountNameLabel'));
      return;
    }

    const initialBalance = balance.trim() ? parseFloat(balance.replace(/,/g, '')) : 0;

    setLoading(true);
    try {
      await api.createAccount({
        name: name.trim(),
        account_type: accountType,
        currency,
        current_balance: isNaN(initialBalance) ? 0 : initialBalance,
      });
      resetForm();
      onAccountCreated();
      onClose();
    } catch (err: any) {
      Alert.alert(t('validationError'), err.message || t('validationError'));
    } finally {
      setLoading(false);
    }
  };

  const accountTypeLabels: Record<string, string> = {
    cash: t('accountTypeCash'),
    bank_account: t('accountTypeBankAccount'),
    credit_card: t('accountTypeCreditCard'),
    loan: t('accountTypeLoan'),
    other: t('accountTypeOther'),
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
              <Text style={styles.subtitle}>ACCOUNTS</Text>
              <Text style={styles.title}>{t('modalCreateAccountTitle')}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {/* Account Name */}
            <Text style={styles.label}>{t('accountNameLabel')}</Text>
            <View style={styles.inputWrapper}>
              <CreditCard size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={name}
                onChangeText={setName}
                placeholder={t('accountNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Account Type */}
            <Text style={styles.label}>{t('accountTypeLabel')}</Text>
            <View style={styles.row}>
              {['bank_account', 'credit_card', 'cash', 'loan', 'other'].map((type) => {
                const isSelected = accountType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setAccountType(type)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {accountTypeLabels[type] || type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Currency */}
            <Text style={styles.label}>{t('currencyLabel')}</Text>
            <View style={styles.row}>
              {['COP', 'USD', 'EUR'].map((curr) => {
                const isSelected = currency === curr;
                return (
                  <TouchableOpacity
                    key={curr}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setCurrency(curr)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {curr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Initial Balance */}
            <Text style={styles.label}>{t('initialBalanceLabel')}</Text>
            <View style={styles.inputWrapper}>
              <DollarSign size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={balance}
                onChangeText={setBalance}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity style={styles.submitButton} onPress={handleCreate} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>{t('saveAccount')}</Text>
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
  form: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
  },
  chipSelected: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.onSecondaryContainer,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  submitButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.onSecondary,
  },
});
