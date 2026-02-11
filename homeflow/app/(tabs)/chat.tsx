import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessageBubble,
  MessageInput,
  mergeChatTheme,
  defaultLightChatTheme,
  defaultDarkChatTheme,
} from '@spezivibe/chat';
import type { ChatMessage, ChatTheme, ChatProvider } from '@spezivibe/chat';
import { useConciergeChat } from '@/lib/chat/useConciergeChat';
import type { QuickAction } from '@/lib/chat/chatHelperPlaybook';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

const LIGHT_THEME = mergeChatTheme(
  {
    colors: {
      background: '#F0F2F8',
      assistantBubble: '#FFFFFF',
      assistantBubbleText: '#2C3E50',
      userBubble: '#8C1515',
      userBubbleText: '#FFFFFF',
      inputBackground: '#FFFFFF',
      inputBorder: '#E5E7EE',
      inputText: '#2C3E50',
      placeholderText: '#7A7F8E',
      sendButton: '#8C1515',
      sendButtonDisabled: '#C7C7CC',
    },
  },
  defaultLightChatTheme,
);

const DARK_THEME = mergeChatTheme(
  {
    colors: {
      background: '#0A0E1A',
      assistantBubble: '#141828',
      assistantBubbleText: '#C8D6E5',
      userBubble: '#8C1515',
      userBubbleText: '#FFFFFF',
      inputBackground: '#141828',
      inputBorder: '#1E2236',
      inputText: '#C8D6E5',
      placeholderText: '#6B7394',
      sendButton: '#B83A4B',
      sendButtonDisabled: '#3A3E50',
    },
  },
  defaultDarkChatTheme,
);

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme: ChatTheme = isDark ? DARK_THEME : LIGHT_THEME;
  const insets = useSafeAreaInsets();

  const provider: ChatProvider | null = OPENAI_API_KEY
    ? { type: 'openai', apiKey: OPENAI_API_KEY }
    : null;

  const {
    messages,
    isLoading,
    isAnimating,
    input,
    setInput,
    sendMessage,
    startFlow,
    activeCheckpoint,
    quickActions,
    handleStop,
  } = useConciergeChat(provider);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Dismiss keyboard when quick actions reappear
  useEffect(() => {
    if (quickActions) {
      Keyboard.dismiss();
    }
  }, [quickActions]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.comingSoon) {
      sendMessage('Throne setup');
      return;
    }
    if (action.flowId) {
      startFlow(action.flowId);
    }
  };

  const handleYesNo = (answer: 'Yes' | 'No') => {
    sendMessage(answer);
  };

  // Find the last assistant message to know where to show Yes/No buttons
  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const showButtons =
      activeCheckpoint?.type === 'YES_NO' &&
      index === lastAssistantIndex &&
      item.role === 'assistant' &&
      !isLoading &&
      !isAnimating;

    return (
      <View>
        <MessageBubble message={item} theme={theme} />
        {showButtons && (
          <View style={styles.yesNoRow}>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                isDark ? styles.yesNoButtonDark : styles.yesNoButtonLight,
              ]}
              onPress={() => handleYesNo('Yes')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.yesNoText,
                  isDark ? styles.yesNoTextDark : styles.yesNoTextLight,
                ]}
              >
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                isDark ? styles.yesNoButtonDark : styles.yesNoButtonLight,
              ]}
              onPress={() => handleYesNo('No')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.yesNoText,
                  isDark ? styles.yesNoTextDark : styles.yesNoTextLight,
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // API key missing - show error but note playbook flows still work
  if (!OPENAI_API_KEY) {
    // Still render the full chat - playbook flows work without API key
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
      >
        <FlatList
          ref={flatListRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        {quickActions && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContainer}
            style={styles.quickActionsScroll}
          >
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[
                  styles.chip,
                  isDark ? styles.chipDark : styles.chipLight,
                  action.comingSoon && styles.chipComingSoon,
                ]}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isDark ? styles.chipTextDark : styles.chipTextLight,
                    action.comingSoon && styles.chipTextComingSoon,
                  ]}
                >
                  {action.label}
                  {action.comingSoon ? ' (coming soon)' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <MessageInput
          theme={theme}
          placeholder="Ask about setup..."
          disabled={isAnimating}
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Yes/No buttons
  yesNoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  yesNoButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  yesNoButtonLight: {
    backgroundColor: '#ECF4F0',
  },
  yesNoButtonDark: {
    backgroundColor: '#0F1E1A',
  },
  yesNoText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  yesNoTextLight: {
    color: '#2C3E50',
  },
  yesNoTextDark: {
    color: '#C8D6E5',
  },

  // Quick action chips
  quickActionsScroll: {
    maxHeight: 52,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EE',
  },
  chipDark: {
    backgroundColor: '#141828',
    borderColor: '#1E2236',
  },
  chipComingSoon: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  chipTextLight: {
    color: '#2C3E50',
  },
  chipTextDark: {
    color: '#C8D6E5',
  },
  chipTextComingSoon: {
    fontStyle: 'italic',
  },
});
