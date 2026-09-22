import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Plus, Check, Trash2, Calendar, Clock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Task } from '../types';
import { api } from '../api/client';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { useLanguage } from '../i18n/LanguageContext';

interface TasksScreenProps {
  isOnline: boolean;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({ isOnline }) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const statusParam = filter === 'all' ? undefined : filter;
      const data = await api.getTasks({ status: statusParam });
      setTasks(data);
    } catch (err: any) {
      console.warn('Error fetching tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleToggleComplete = async (task: Task) => {
    if (task.status === 'completed') return;
    try {
      await api.completeTask(task.id);
      fetchTasks();
    } catch (err: any) {
      Alert.alert(t('errorCompletingTask'), err.message || t('errorCompletingTask'));
    }
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      t('deleteTaskTitle'),
      t('deleteTaskConfirm', { title: task.title }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTask(task.id);
              fetchTasks();
            } catch (err: any) {
              Alert.alert(t('errorDeletingTask'), err.message || t('errorDeletingTask'));
            }
          },
        },
      ]
    );
  };

  const filterLabels = {
    all: t('filterAll'),
    pending: t('filterPending'),
    completed: t('filterCompleted'),
  };

  const priorityLabels = {
    high: t('priorityHigh'),
    medium: t('priorityMedium'),
    low: t('priorityLow'),
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isCompleted = item.status === 'completed';

    const priorityColors = {
      high: { bg: colors.primaryLight, text: colors.primaryDark, border: colors.primary },
      medium: { bg: colors.secondaryLight, text: colors.secondaryDark, border: colors.secondary },
      low: { bg: colors.surfaceContainerLow, text: colors.textSecondary, border: colors.border },
    };

    const pStyle = priorityColors[item.priority] || priorityColors.medium;
    const priorityText = priorityLabels[item.priority] || item.priority.toUpperCase();

    return (
      <View style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
          onPress={() => handleToggleComplete(item)}
          disabled={isCompleted}
        >
          {isCompleted && <Check size={14} color={colors.white} strokeWidth={3} />}
        </TouchableOpacity>

        {/* Details */}
        <View style={styles.taskDetails}>
          <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.taskDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Metadata Badges */}
          <View style={styles.metaRow}>
            {/* Priority Badge */}
            <View
              style={[
                styles.badge,
                { backgroundColor: pStyle.bg, borderColor: pStyle.border },
              ]}
            >
              <Text style={[styles.badgeText, { color: pStyle.text }]}>
                {priorityText.toUpperCase()}
              </Text>
            </View>

            {/* Due Date Badge */}
            {item.due_date ? (
              <View style={styles.dateBadge}>
                <Calendar size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.dateBadgeText}>{`${t('duePrefix')} ${item.due_date}`}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTask(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Bar & Add Button */}
      <View style={styles.topBar}>
        <View style={styles.filterRow}>
          {(['all', 'pending', 'completed'] as const).map((f) => {
            const isSelected = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {filterLabels[f]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={18} color={colors.onPrimary} />
          <Text style={styles.addButtonText}>{t('newTask')}</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTaskItem}
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
              <Clock size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('noTasksFound')}</Text>
            </View>
          }
        />
      )}

      {/* Modal */}
      <CreateTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onTaskCreated={fetchTasks}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
  },
  filterChipSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textSecondary,
  },
  filterChipTextSelected: {
    color: colors.onPrimaryContainer,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.onPrimary,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  taskCardCompleted: {
    backgroundColor: colors.surfaceContainerLow,
    opacity: 0.75,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  taskDescription: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.5,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textMuted,
  },
  deleteButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Newsreader_600SemiBold',
    color: colors.textPrimary,
  },
});
