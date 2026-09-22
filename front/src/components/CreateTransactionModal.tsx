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
  ScrollView,
} from 'react-native';
import { X, DollarSign, Calendar, Store } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { Account } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface CreateTransactionModalProps {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onTransactionCreated: () => void;
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  visible,
  accounts,
  onClose,
  onTransactionCreated,
}) => {
  const { t } = useLanguage();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('food');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    accounts.length > 0 ? accounts[0].id : null
  );
  const [transactionDate, setTransactionDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = ['food', 'transport', 'utilities', 'shopping', 'education', 'health', 'entertainment', 'other'];

  const categoryLabels: Record<string, string> = {
    food: t('categoryFood'),
    transport: t('categoryTransport'),
    utilities: t('categoryUtilities'),
    shopping: t('categoryShopping'),
    education: t('categoryEducation'),
    health: t('categoryHealth'),
    entertainment: t('categoryEntertainment'),
    other: t('categoryOther'),
  };

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setMerchant('');
    setCategory('food');
    setTransactionDate('');
    setDescription('');
  };

  const handleCreate = async () => {
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t('validationError'), t('amountLabel'));
      return;
    }

    setLoading(true);
    try {
      await api.createTransaction({
        type,
        amount: parsedAmount,
        currency: 'COP',
        account_id: selectedAccountId,
        merchant: merchant.trim() || undefined,
        category,
        transaction_date: transactionDate.trim() || undefined,
        description: description.trim() || undefined,
      });
      resetForm();
      onTransactionCreated();
      onClose();
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
              <Text style={styles.subtitle}>FINANCES</Text>
              <Text style={styles.title}>{t('modalCreateTransactionTitle')}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form}>
            {/* Income / Expense Toggle */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  type === 'expense' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setType('expense')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    type === 'expense' && { color: colors.white },
                  ]}
                >
                  {t('typeExpense')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  type === 'income' && { backgroundColor: colors.secondary },
                ]}
                onPress={() => setType('income')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    type === 'income' && { color: colors.white },
                  ]}
                >
                  {t('typeIncome')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <Text style={styles.label}>{t('amountLabel')}</Text>
            <View style={styles.inputWrapper}>
              <DollarSign size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={amount}
                onChangeText={setAmount}
                placeholder="45000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Merchant */}
            <Text style={styles.label}>{t('merchantLabel')}</Text>
            <View style={styles.inputWrapper}>
              <Store size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Ej. Éxito, Starbucks, Rappi"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Category selection */}
            <Text style={styles.label}>{t('categoryLabel')}</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextSelected,
                      ]}
                    >
                      {categoryLabels[cat] || cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Account Selector */}
            {accounts.length > 0 && (
              <>
                <Text style={styles.label}>{t('selectAccountLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountRow}>
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.accountChip,
                          isSelected && styles.accountChipSelected,
                        ]}
                        onPress={() => setSelectedAccountId(acc.id)}
                      >
                        <Text
                          style={[
                            styles.accountChipText,
                            isSelected && styles.accountChipTextSelected,
                          ]}
                        >
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Transaction Date */}
            <Text style={styles.label}>{t('dateLabel')}</Text>
            <View style={styles.inputWrapper}>
              <Calendar size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                value={transactionDate}
                onChangeText={setTransactionDate}
                placeholder={new Date().toISOString().split('T')[0]}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: type === 'expense' ? colors.primary : colors.secondary },
              ]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>{t('saveTransaction')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '90%',
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
    paddingBottom: 20,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textSecondary,
  },
  label: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textSecondary,
    marginTop: 4,
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
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
  },
  categoryChipSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textSecondary,
  },
  categoryTextSelected: {
    color: colors.onPrimaryContainer,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  accountRow: {
    flexDirection: 'row',
  },
  accountChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
    marginRight: 8,
  },
  accountChipSelected: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  accountChipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textSecondary,
  },
  accountChipTextSelected: {
    color: colors.onSecondaryContainer,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.white,
  },
});
