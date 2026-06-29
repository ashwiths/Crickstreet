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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isError?: boolean;
}

const SUGGESTIONS = [
  "🏏 What is LBW?",
  "📖 Explain Powerplay.",
  "🎯 Batting tips for beginners.",
  "⚡ What is a Free Hit?",
  "🧤 Fielding positions explained.",
  "📊 How is Net Run Rate calculated?"
];

export default function AiChatScreen() {
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
      // In production, this uses the secure Expo API route that protects the GEMINI_API_KEY
      const response = await fetch('/api/ai/chat', {
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
        styles.messageBubble,
        msg.isUser ? styles.userBubble : styles.aiBubble,
        msg.isError && styles.errorBubble,
      ]}
    >
      {!msg.isUser && (
        <View style={styles.aiIconContainer}>
          <Ionicons name="sparkles" size={16} color="#4ADE80" />
        </View>
      )}
      <View style={styles.messageContent}>
        <Text style={[styles.messageText, msg.isError && styles.errorText]}>
          {msg.text}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="flash" size={24} color="#4ADE80" />
          <Text style={styles.headerTitle}>Crickstreet AI</Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
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
        >
          {messages.map(renderMessage)}
          
          {isLoading && (
            <Animated.View style={[styles.messageBubble, styles.aiBubble, { opacity: fadeAnim }]}>
               <View style={styles.aiIconContainer}>
                <Ionicons name="sparkles" size={16} color="#4ADE80" />
              </View>
              <View style={styles.messageContent}>
                <Text style={styles.messageText}>Thinking...</Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Suggestions - only show if no user messages yet */}
        {messages.length === 1 && !isLoading && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsContainer}
            contentContainerStyle={styles.suggestionsContent}
          >
            {SUGGESTIONS.map((suggestion, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.suggestionBadge}
                onPress={() => handleSend(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about cricket rules, tips..."
            placeholderTextColor="#888"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            autoFocus={true}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color={inputText.trim() ? "#FFF" : "#666"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050F08', // Match the app's dark green background
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2920',
    backgroundColor: 'rgba(5, 15, 8, 0.95)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  clearButton: {
    padding: 8,
    marginRight: -8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 10,
  },
  userBubble: {
    backgroundColor: '#1C3F2A',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#121C16',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#1A2920',
  },
  errorBubble: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: '#FF6B6B',
  },
  aiIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    color: '#FFB4B4',
  },
  suggestionsContainer: {
    maxHeight: 50,
    minHeight: 50,
    borderTopWidth: 1,
    borderTopColor: '#1A2920',
  },
  suggestionsContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  suggestionBadge: {
    backgroundColor: '#121C16',
    borderWidth: 1,
    borderColor: '#1A2920',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionText: {
    color: '#4ADE80',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0A150E',
    borderTopWidth: 1,
    borderTopColor: '#1A2920',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#121C16',
    color: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#1A2920',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: '#1A2920',
  },
});
