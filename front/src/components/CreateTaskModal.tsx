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
import { X, Calendar } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onTaskCreated,
}) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(t('validationError'), t('titleLabel'));
      return;
    }

    setLoading(true);
    try {
      await api.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate.trim() || undefined,
      });
      resetForm();
      onTaskCreated();
      onClose();
    } catch (err: any) {
      Alert.alert(t('errorCreatingTask'), err.message || t('errorCreatingTask'));
    } finally {
      setLoading(false);
    }
  };

  const priorityLabels = {
    high: t('priorityHigh'),
    medium: t('priorityMedium'),
    low: t('priorityLow'),
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
              <Text style={styles.subtitle}>CHECKLIST</Text>
              <Text style={styles.title}>{t('modalCreateTaskTitle')}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form}>
            {/* Title */}
            <Text style={styles.label}>{t('titleLabel')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />

            {/* Description */}
            <Text style={styles.label}>{t('descriptionLabel')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('descriptionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Priority Pills */}
            <Text style={styles.label}>{t('priorityLabel')}</Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high'] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityPill,
                      isSelected && styles.priorityPillSelected,
                      isSelected &&
                        p === 'high' && { backgroundColor: colors.primary, borderColor: colors.primary },
                      isSelected &&
                        p === 'medium' && { backgroundColor: colors.secondary, borderColor: colors.secondary },
                      isSelected &&
                        p === 'low' && { backgroundColor: colors.tertiary, borderColor: colors.tertiary },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        isSelected && { color: colors.white },
                      ]}
                    >
                      {priorityLabels[p]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Due Date */}
            <Text style={styles.label}>{t('dueDateLabel')}</Text>
            <View style={styles.dateInputWrapper}>
              <Calendar size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.dateInput}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder={new Date().toISOString().split('T')[0]}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>{t('saveTask')}</Text>
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
    maxHeight: '85%',
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
  label: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textSecondary,
    marginTop: 4,
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
    height: 80,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
  },
  priorityPillSelected: {
    borderColor: colors.primary,
  },
  priorityText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textSecondary,
  },
  dateInputWrapper: {
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
  dateInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.onPrimary,
  },
});
