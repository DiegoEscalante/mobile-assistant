import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Settings } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  isOnline: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle = 'Quietsude',
  isOnline,
  onOpenSettings,
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.rightContainer}>
        {/* Connection status badge */}
        <TouchableOpacity style={styles.statusBadge} onPress={onOpenSettings} activeOpacity={0.7}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? colors.secondary : colors.error },
            ]}
          />
          <Text style={styles.statusText}>{isOnline ? t('online') : t('offline')}</Text>
        </TouchableOpacity>

        {/* Settings button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenSettings}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Settings size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flexDirection: 'column',
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Newsreader_600SemiBold',
    color: colors.textPrimary,
    lineHeight: 26,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textSecondary,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
