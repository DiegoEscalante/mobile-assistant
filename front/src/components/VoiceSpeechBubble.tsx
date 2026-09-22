import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Radio, AlertCircle } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { colors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';

interface VoiceSpeechBubbleProps {
  onSpeechInput: (transcript: string) => void;
  isProcessing: boolean;
  latestAssistantResponse?: string;
}

export const VoiceSpeechBubble: React.FC<VoiceSpeechBubbleProps> = ({
  onSpeechInput,
  isProcessing,
  latestAssistantResponse,
}) => {
  const { language, t } = useLanguage();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [noAudioWarning, setNoAudioWarning] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Animated values for the 3 aura rings
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;
  const pulseCenter = useRef(new Animated.Value(1)).current;

  // Listen to native speech recognition events (Android / iOS)
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const result = event.results[0]?.transcript || '';
    setInterimText(result);
    if (event.isFinal) {
      setIsListening(false);
      setInterimText('');
      if (result.trim().length > 0) {
        setNoAudioWarning(null);
        onSpeechInput(result.trim());
      } else {
        setNoAudioWarning(t('noAudioDetected'));
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('Native speech recognition error:', event.error, event.message);
    setIsListening(false);
    setInterimText('');
    setNoAudioWarning(t('noAudioDetected'));
  });

  // Start background loop animation for the aura rings
  useEffect(() => {
    const createRingLoop = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const ring1Loop = createRingLoop(ring1Anim, 0);
    const ring2Loop = createRingLoop(ring2Anim, 800);
    const ring3Loop = createRingLoop(ring3Anim, 1600);

    ring1Loop.start();
    ring2Loop.start();
    ring3Loop.start();

    return () => {
      ring1Loop.stop();
      ring2Loop.stop();
      ring3Loop.stop();
    };
  }, [ring1Anim, ring2Anim, ring3Anim]);

  // Pulse animation for the central circle when active
  useEffect(() => {
    if (isListening || isSpeaking || isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseCenter, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseCenter, {
            toValue: 0.94,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseCenter.setValue(1);
    }
  }, [isListening, isSpeaking, isProcessing, pulseCenter]);

  // Handle TTS (Speak response aloud when new message arrives)
  useEffect(() => {
    if (!latestAssistantResponse || audioMuted) return;

    const cleanText = latestAssistantResponse
      .replace(/[*_#`~-]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (cleanText.length === 0) return;

    const speakResponse = async () => {
      try {
        setIsSpeaking(true);
        const speechLang = language === 'es' ? 'es-ES' : 'en-US';

        Speech.speak(cleanText, {
          language: speechLang,
          pitch: 1.0,
          rate: 1.0,
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
        });
      } catch (err) {
        console.warn('TTS error:', err);
        setIsSpeaking(false);
      }
    };

    speakResponse();

    return () => {
      Speech.stop();
    };
  }, [latestAssistantResponse, audioMuted, language]);

  // Initialize Web Speech Recognition if on Web
  useEffect(() => {
    if (Platform.OS === 'web' && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'es' ? 'es-ES' : 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInterimText(transcript);

        if (event.results[0].isFinal) {
          setIsListening(false);
          setInterimText('');
          if (transcript.trim().length > 0) {
            setNoAudioWarning(null);
            onSpeechInput(transcript.trim());
          } else {
            setNoAudioWarning(t('noAudioDetected'));
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Web speech recognition error:', event.error);
        setIsListening(false);
        setInterimText('');
        setNoAudioWarning(t('noAudioDetected'));
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language, onSpeechInput, t]);

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permiso de Micrófono',
            message: 'La aplicación requiere acceso al micrófono para escuchar tus comandos de voz.',
            buttonNeutral: 'Más tarde',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Permitir',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return res.granted;
    } catch (err) {
      console.warn('Error requesting mic permission:', err);
      return false;
    }
  };

  const toggleSpeechRecognition = async () => {
    setNoAudioWarning(null);

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    if (isListening) {
      if (Platform.OS === 'web') {
        if (recognitionRef.current) recognitionRef.current.stop();
      } else {
        ExpoSpeechRecognitionModule.stop();
      }
      setIsListening(false);
      if (interimText.trim().length > 0) {
        onSpeechInput(interimText.trim());
        setInterimText('');
      }
      return;
    }

    const hasMicPermission = await requestMicrophonePermission();
    if (!hasMicPermission) {
      setNoAudioWarning('Permiso de micrófono no otorgado.');
      return;
    }

    if (Platform.OS === 'web') {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = language === 'es' ? 'es-ES' : 'en-US';
          recognitionRef.current.start();
          setIsListening(true);
        } catch (err) {
          console.warn('Could not start web recognition:', err);
          setNoAudioWarning(t('voiceNotSupported'));
        }
      } else {
        setNoAudioWarning(t('voiceNotSupported'));
      }
    } else {
      try {
        ExpoSpeechRecognitionModule.start({
          lang: language === 'es' ? 'es-ES' : 'en-US',
          interimResults: true,
          maxAlternatives: 1,
        });
        setIsListening(true);
      } catch (err) {
        console.warn('Could not start native speech recognition:', err);
        setNoAudioWarning(t('voiceNotSupported'));
      }
    }
  };

  const getAuraColor = () => {
    if (isListening) return colors.secondary;
    if (isSpeaking) return colors.secondaryDark;
    if (isProcessing) return colors.tertiary;
    return colors.primary;
  };

  const renderAuraRing = (anim: Animated.Value) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.45],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 0.3, 0],
    });

    return (
      <Animated.View
        style={[
          styles.auraRing,
          {
            borderColor: getAuraColor(),
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  const getStatusText = () => {
    if (isListening) return t('voiceListening');
    if (isSpeaking) return t('voiceSpeaking');
    if (isProcessing) return t('voiceProcessing');
    return t('voiceTapToSpeak');
  };

  return (
    <View style={styles.container}>
      {/* Header Badge & Audio Mute Button */}
      <View style={styles.topMetaRow}>
        <View style={styles.voiceHeaderBadge}>
          <Radio size={12} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.voiceHeaderBadgeText}>{t('voiceModeHeader')}</Text>
        </View>

        <TouchableOpacity
          style={styles.muteButton}
          onPress={() => {
            const nextMuted = !audioMuted;
            setAudioMuted(nextMuted);
            if (nextMuted) Speech.stop();
          }}
          activeOpacity={0.7}
        >
          {audioMuted ? (
            <VolumeX size={16} color={colors.error} />
          ) : (
            <Volume2 size={16} color={colors.primary} />
          )}
          <Text style={styles.muteButtonText}>
            {audioMuted ? t('voiceMute') : t('voiceUnmute')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hero Aura Orbit & Central Perfect Circular Voice Orb */}
      <View style={styles.orbWrapper}>
        {/* Animated Circular Aura Outer Rings */}
        {renderAuraRing(ring1Anim)}
        {renderAuraRing(ring2Anim)}
        {renderAuraRing(ring3Anim)}

        {/* Floating Particle Dots surrounding circle */}
        <View style={[styles.particleDot, styles.particleTop]} />
        <View style={[styles.particleDot, styles.particleRight]} />
        <View style={[styles.particleDot, styles.particleBottom]} />
        <View style={[styles.particleDot, styles.particleLeft]} />

        {/* Main Central Interactive Circular Voice Sphere / Orb */}
        <Animated.View style={{ transform: [{ scale: pulseCenter }] }}>
          <TouchableOpacity
            style={[
              styles.circularVoiceOrb,
              isListening && styles.orbListening,
              isSpeaking && styles.orbSpeaking,
              isProcessing && styles.orbProcessing,
            ]}
            onPress={toggleSpeechRecognition}
            activeOpacity={0.85}
          >
            {isListening ? (
              <MicOff size={40} color={colors.white} />
            ) : isSpeaking ? (
              <Volume2 size={40} color={colors.white} />
            ) : isProcessing ? (
              <Sparkles size={40} color={colors.white} />
            ) : (
              <Mic size={40} color={colors.white} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Status & Live Speech Transcript Card below circle */}
      <View style={styles.statusBadgeCard}>
        <Text style={styles.statusText}>
          {interimText ? `"${interimText}"` : getStatusText()}
        </Text>
      </View>

      {/* No Audio Warning Alert */}
      {noAudioWarning && (
        <View style={styles.warningCard}>
          <AlertCircle size={16} color={colors.error} style={{ marginRight: 6 }} />
          <Text style={styles.warningText}>{noAudioWarning}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    width: '100%',
  },
  topMetaRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceHeaderBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  muteButton: {
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
  muteButtonText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.textSecondary,
  },
  orbWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 190,
    width: 190,
    marginVertical: 4,
  },
  auraRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
  },
  circularVoiceOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  orbListening: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
  },
  orbSpeaking: {
    backgroundColor: colors.secondaryDark,
    shadowColor: colors.secondaryDark,
  },
  orbProcessing: {
    backgroundColor: colors.tertiary,
    shadowColor: colors.tertiary,
  },
  statusBadgeCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 4,
    maxWidth: '90%',
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  particleDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    opacity: 0.75,
  },
  particleTop: {
    top: 6,
    alignSelf: 'center',
  },
  particleRight: {
    right: 6,
    top: '48%',
  },
  particleBottom: {
    bottom: 6,
    alignSelf: 'center',
  },
  particleLeft: {
    left: 6,
    top: '48%',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: colors.error,
  },
});
