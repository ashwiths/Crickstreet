import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { br, fs, s, sp } from '../../theme/responsive';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isError?: boolean;
}

const getApiUrl = (path: string) => {
  if (Platform.OS === 'web') return path;
  
  if (process.env.EXPO_PUBLIC_API_URL) {
    return `${process.env.EXPO_PUBLIC_API_URL}${path}`;
  }
  
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (!debuggerHost) {
    return `http://localhost:8081${path}`;
  }
  return `http://${debuggerHost}${path}`;
};

const SUGGESTIONS = [
  "🏏 What is LBW?",
  "📖 Explain Powerplay.",
  "🎯 Batting tips for beginners.",
  "⚡ What is a Free Hit?",
  "🧤 Fielding positions explained.",
  "📊 How is Net Run Rate calculated?"
];

export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hello! I'm Crickstreet AI. Ask me anything about cricket rules, strategies, or match formats.",
      isUser: false,
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Animation for the typing indicator
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    if (isLoading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          })
        ])
      );
      animation.start();
    } else {
      fadeAnim.setValue(0.3);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isLoading]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (text: string = inputText) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    Keyboard.dismiss();
    setIsLoading(true);
    scrollToBottom();

    try {
      const response = await fetch(getApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get a response');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: Date.now().toString(),
        text: "Chat cleared. What else would you like to know about cricket?",
        isUser: false,
      }
    ]);
  };

  const renderMessage = (msg: Message) => (
    <View
      key={msg.id}
      style={[
        styles.messageBubbleWrapper,
        msg.isUser ? styles.userBubbleWrapper : styles.aiBubbleWrapper,
      ]}
    >
      {msg.isUser ? (
        <LinearGradient
          colors={['#59C749', '#46B137']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.messageBubble, styles.userBubble]}
        >
          <Text style={styles.userMessageText}>{msg.text}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.messageBubble, styles.aiBubble, msg.isError && styles.errorBubble]}>
          <View style={styles.aiIconContainer}>
            <Ionicons name="sparkles" size={15} color="#59C749" />
          </View>
          <View style={styles.messageContent}>
            <Text style={[styles.aiMessageText, msg.isError && styles.errorText]}>
              {msg.text}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Background Gradient matching Home Screen */}
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.35, 0.7]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="flash" size={16} color="#59C749" />
          </View>
          <Text style={styles.headerTitle}>Crickstreet AI</Text>
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={handleClear} hitSlop={8}>
          <Feather name="trash-2" size={18} color="#FF4D4D" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          
          {isLoading && (
            <Animated.View style={[styles.messageBubbleWrapper, styles.aiBubbleWrapper, { opacity: fadeAnim }]}>
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <View style={styles.aiIconContainer}>
                  <Ionicons name="sparkles" size={15} color="#59C749" />
                </View>
                <View style={styles.messageContent}>
                  <Text style={styles.aiMessageText}>Thinking...</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Suggestions - only show if no user messages yet */}
        {messages.length === 1 && !isLoading && (
          <View style={styles.suggestionsContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
            >
              {SUGGESTIONS.map((suggestion, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.suggestionBadge}
                  onPress={() => handleSend(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 16 }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about cricket rules, tips..."
            placeholderTextColor="#64748B"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            autoFocus={false}
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            {inputText.trim() ? (
              <LinearGradient
                colors={['#59C749', '#3BA42C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendGradient}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </LinearGradient>
            ) : (
              <View style={styles.sendIdleInner}>
                <Ionicons name="send" size={18} color="#59C749" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F1',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
    backgroundColor: 'transparent',
  },
  iconButton: {
    width: s(38),
    height: s(38),
    borderRadius: s(19),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  headerIconCircle: {
    width: s(30),
    height: s(30),
    borderRadius: s(15),
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#1A1A1A',
    fontSize: fs.lg,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
    gap: sp.md,
    paddingBottom: sp.xl,
  },
  messageBubbleWrapper: {
    width: '100%',
  },
  userBubbleWrapper: {
    alignItems: 'flex-end',
  },
  aiBubbleWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: sp.md,
    borderRadius: br.xl,
  },
  userBubble: {
    borderBottomRightRadius: br.xs,
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  aiBubble: {
    flexDirection: 'row',
    gap: sp.sm,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: br.xs,
    borderWidth: 1,
    borderColor: '#E8E4D4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  errorBubble: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFD1D1',
  },
  aiIconContainer: {
    width: s(26),
    height: s(26),
    borderRadius: s(13),
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  messageContent: {
    flex: 1,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontSize: fs.base,
    lineHeight: fs.base * 1.45,
    fontWeight: '500',
  },
  aiMessageText: {
    color: '#1A1A1A',
    fontSize: fs.base,
    lineHeight: fs.base * 1.45,
    fontWeight: '400',
  },
  errorText: {
    color: '#E53E3E',
  },
  suggestionsContainer: {
    paddingVertical: sp.sm,
    backgroundColor: 'transparent',
  },
  suggestionsContent: {
    paddingHorizontal: sp.lg,
    gap: sp.sm,
  },
  suggestionBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4D4',
    borderRadius: br.full,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  suggestionText: {
    color: '#2D5016',
    fontSize: fs.sm,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: sp.lg,
    paddingTop: sp.sm,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: sp.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderRadius: br.xxl,
    paddingHorizontal: sp.lg,
    paddingTop: sp.sm2,
    paddingBottom: sp.sm2,
    fontSize: fs.base,
    maxHeight: s(100),
    minHeight: s(48),
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  sendButton: {
    width: s(46),
    height: s(46),
    borderRadius: s(23),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendIdleInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: s(23),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
