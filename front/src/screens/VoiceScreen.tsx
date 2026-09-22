import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Sparkles, Bot, Volume2, Mic } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { VoiceSpeechBubble } from '../components/VoiceSpeechBubble';

interface VoiceScreenProps {
  isOnline: boolean;
}

export const VoiceScreen: React.FC<VoiceScreenProps> = ({ isOnline }) => {
  const { language, t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [latestResponse, setLatestResponse] = useState<string | null>(null);
  const [lastQueryText, setLastQueryText] = useState<string | null>(null);

  const suggestedVoicePrompts = [
    t('suggestedPrompt1'),
    t('suggestedPrompt2'),
    t('suggestedPrompt3'),
  ];

  const handleVoiceQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    setLastQueryText(queryText.trim());
    setLoading(true);

    try {
      const responseText = await api.sendChatMessage(queryText.trim(), language);
      setLatestResponse(responseText);
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || (err.message && err.message.includes('canceled'));
      const errorText = isTimeout
        ? t('timeoutError')
        : t('connectionError', { msg: err.message || 'Server error' });
      setLatestResponse(errorText);
    } finally {
      setLoading(false);
    }
  };

  const handleReplayVoice = () => {
    if (!latestResponse) return;
    const cleanText = latestResponse.replace(/[*_#`~-]/g, '').trim();
    Speech.stop();
    Speech.speak(cleanText, {
      language: language === 'es' ? 'es-ES' : 'en-US',
      pitch: 1.0,
      rate: 1.0,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('offlineBanner')}</Text>
        </View>
      )}

      {/* Main Full-Screen Hero Voice Speech Bubble */}
      <View style={styles.voiceSection}>
        <VoiceSpeechBubble
          onSpeechInput={handleVoiceQuery}
          isProcessing={loading}
          latestAssistantResponse={latestResponse || undefined}
        />
      </View>

      {/* Spoken Query & Assistant Response Display Card */}
      {lastQueryText && (
        <View style={styles.responseContainer}>
          {/* User Query Chip */}
          <View style={styles.userQueryCard}>
            <Mic size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.userQueryText}>"{lastQueryText}"</Text>
          </View>

          {/* AI Response Card */}
          <View style={styles.aiResponseCard}>
            <View style={styles.aiResponseHeader}>
              <View style={styles.aiAvatar}>
                <Bot size={16} color={colors.primary} />
              </View>
              <Text style={styles.aiResponseTitle}>{t('latestVoiceResponse')}</Text>

              {latestResponse && (
                <TouchableOpacity style={styles.replayButton} onPress={handleReplayVoice}>
                  <Volume2 size={16} color={colors.primary} />
                  <Text style={styles.replayButtonText}>{t('repeatVoice')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>{t('synthesizingResponse')}</Text>
              </View>
            ) : (
              <Text style={styles.aiResponseText}>{latestResponse}</Text>
            )}
          </View>
        </View>
      )}

      {/* Quick Voice Suggestions */}
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsHeader}>
          <Sparkles size={12} color={colors.primary} /> {t('suggestedPromptsHeader')}
        </Text>
        <View style={styles.suggestionsList}>
          {suggestedVoicePrompts.map((prompt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.suggestionChip}
              onPress={() => handleVoiceQuery(prompt)}
              activeOpacity={0.7}
            >
              <Mic size={14} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.suggestionChipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  offlineBanner: {
    backgroundColor: colors.errorContainer,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.error,
  },
  offlineText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.error,
  },
  voiceSection: {
    width: '100%',
  },
  responseContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  userQueryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  userQueryText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.primaryDark,
  },
  aiResponseCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  aiResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aiResponseTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textMuted,
    flex: 1,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replayButtonText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.primary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textMuted,
  },
  aiResponseText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  suggestionsHeader: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  suggestionChipText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textPrimary,
  },
});
