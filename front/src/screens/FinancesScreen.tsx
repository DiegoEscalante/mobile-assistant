import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Building2,
  Receipt,
  QrCode,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Account, Transaction } from '../types';
import { api } from '../api/client';
import { CreateTransactionModal } from '../components/CreateTransactionModal';
import { CreateAccountModal } from '../components/CreateAccountModal';
import { BankWebhookModal } from '../components/BankWebhookModal';
import { useLanguage } from '../i18n/LanguageContext';

interface FinancesScreenProps {
  isOnline: boolean;
}

export const FinancesScreen: React.FC<FinancesScreenProps> = ({ isOnline }) => {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [accModalVisible, setAccModalVisible] = useState(false);
  const [webhookModalVisible, setWebhookModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [accs, txs] = await Promise.all([
        api.getAccounts().catch(() => []),
        api.getTransactions().catch(() => []),
      ]);
      setAccounts(accs);
      setTransactions(txs);
    } catch (err: any) {
      console.warn('Error fetching financial data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netCashFlow = totalIncome - totalExpenses;

  const formatMoney = (val: number, currency = 'COP') => {
    return `${currency === 'COP' ? '$' : currency + ' '}${val.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

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

  const accountTypeLabels: Record<string, string> = {
    cash: t('accountTypeCash'),
    bank_account: t('accountTypeBankAccount'),
    credit_card: t('accountTypeCreditCard'),
    loan: t('accountTypeLoan'),
    other: t('accountTypeOther'),
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Cash Flow Summary Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroCardSubtitle}>{t('netCashFlow').toUpperCase()}</Text>
        <Text
          style={[
            styles.heroCardAmount,
            { color: netCashFlow >= 0 ? colors.textPrimary : colors.primary },
          ]}
        >
          {formatMoney(netCashFlow)}
        </Text>

        <View style={styles.heroDivider} />

        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <View style={styles.statIconIncome}>
              <ArrowUpRight size={14} color={colors.secondaryDark} />
            </View>
            <View>
              <Text style={styles.statLabel}>{t('totalIncome')}</Text>
              <Text style={styles.statValueIncome}>+{formatMoney(totalIncome)}</Text>
            </View>
          </View>

          <View style={styles.heroStat}>
            <View style={styles.statIconExpense}>
              <ArrowDownRight size={14} color={colors.primaryDark} />
            </View>
            <View>
              <Text style={styles.statLabel}>{t('totalExpenses')}</Text>
              <Text style={styles.statValueExpense}>-{formatMoney(totalExpenses)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={() => setTxModalVisible(true)}
        >
          <Plus size={16} color={colors.onPrimary} />
          <Text style={styles.actionButtonPrimaryText}>{t('newTransaction')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => setAccModalVisible(true)}
        >
          <Building2 size={16} color={colors.textPrimary} />
          <Text style={styles.actionButtonSecondaryText}>+ {t('newAccount')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => setWebhookModalVisible(true)}
        >
          <QrCode size={16} color={colors.secondaryDark} />
          <Text style={styles.actionButtonSecondaryText}>{t('simulateBank')}</Text>
        </TouchableOpacity>
      </View>

      {/* Accounts Carousel */}
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionTitle}>{t('accountsSection')}</Text>
        <TouchableOpacity onPress={() => setAccModalVisible(true)}>
          <Text style={styles.sectionLink}>+ {t('newAccount')}</Text>
        </TouchableOpacity>
      </View>

      {accounts.length === 0 ? (
        <TouchableOpacity style={styles.noAccountsCard} onPress={() => setAccModalVisible(true)}>
          <CreditCard size={24} color={colors.textMuted} />
          <Text style={styles.noAccountsText}>{t('noAccountsFound')}</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
          {accounts.map((acc) => (
            <View key={acc.id} style={styles.accountCard}>
              <View style={styles.accountCardTop}>
                <CreditCard size={18} color={colors.secondary} />
                <Text style={styles.accountBadge}>
                  {(accountTypeLabels[acc.account_type] || acc.account_type).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.accountName}>{acc.name}</Text>
              <Text style={styles.accountBalance}>{formatMoney(acc.current_balance, acc.currency)}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Recent Transactions Section Title */}
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionTitle}>{t('transactionsSection')}</Text>
        <Text style={styles.sectionSubtitle}>{transactions.length}</Text>
      </View>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isExpense = item.type === 'expense';

    return (
      <View style={styles.txCard}>
        <View
          style={[
            styles.txIconContainer,
            { backgroundColor: isExpense ? colors.primaryLight : colors.secondaryLight },
          ]}
        >
          {isExpense ? (
            <ArrowDownRight size={18} color={colors.primaryDark} />
          ) : (
            <ArrowUpRight size={18} color={colors.secondaryDark} />
          )}
        </View>

        <View style={styles.txDetails}>
          <Text style={styles.txMerchant}>
            {item.merchant || item.description || (isExpense ? t('typeExpense') : t('typeIncome'))}
          </Text>
          <View style={styles.txMetaRow}>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {(categoryLabels[item.category] || item.category).toUpperCase()}
                </Text>
              </View>
            )}
            {item.transaction_date && (
              <Text style={styles.txDate}>{item.transaction_date}</Text>
            )}
          </View>
        </View>

        <Text
          style={[
            styles.txAmount,
            { color: isExpense ? colors.textPrimary : colors.secondaryDark },
          ]}
        >
          {isExpense ? '-' : '+'}{formatMoney(item.amount, item.currency)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransactionItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Receipt size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('noTransactionsFound')}</Text>
            </View>
          }
        />
      )}

      {/* Modals */}
      <CreateTransactionModal
        visible={txModalVisible}
        accounts={accounts}
        onClose={() => setTxModalVisible(false)}
        onTransactionCreated={fetchData}
      />

      <CreateAccountModal
        visible={accModalVisible}
        onClose={() => setAccModalVisible(false)}
        onAccountCreated={fetchData}
      />

      <BankWebhookModal
        visible={webhookModalVisible}
        onClose={() => setWebhookModalVisible(false)}
        onProcessed={fetchData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  headerSection: {
    marginBottom: 10,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  heroCardSubtitle: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  heroCardAmount: {
    fontSize: 32,
    fontFamily: 'Newsreader_600SemiBold',
    marginTop: 4,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconIncome: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconExpense: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textMuted,
  },
  statValueIncome: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.secondaryDark,
  },
  statValueExpense: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.primaryDark,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  actionButtonPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  actionButtonPrimaryText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.onPrimary,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 4,
  },
  actionButtonSecondaryText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textPrimary,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Newsreader_600SemiBold',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textMuted,
  },
  sectionLink: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.secondary,
  },
  noAccountsCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  noAccountsText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textMuted,
  },
  accountsScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    width: 140,
    marginRight: 10,
    justifyContent: 'space-between',
    height: 94,
  },
  accountCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountBadge: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  accountName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textPrimary,
  },
  accountBalance: {
    fontSize: 13,
    fontFamily: 'Newsreader_600SemiBold',
    color: colors.secondaryDark,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    gap: 12,
  },
  txIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txDetails: {
    flex: 1,
  },
  txMerchant: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textPrimary,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textMuted,
  },
  txDate: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textMuted,
  },
  txAmount: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Newsreader_600SemiBold',
    color: colors.textPrimary,
  },
});
