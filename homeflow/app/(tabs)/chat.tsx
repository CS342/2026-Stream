import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useAppTheme } from '@/lib/theme/ThemeContext';
import { getClientLLMProvider } from '@/lib/config/llm';

/**
 * TODO: Once Firebase backend is set up, move OpenAI calls to a Cloud
 * Function or Cloud Run endpoint and remove client-side API key usage.
 */

export default function ChatScreen() {
  const { theme: appTheme } = useAppTheme();
  const { isDark, colors: c } = appTheme;

  const chatTheme: ChatTheme = useMemo(
    () =>
      mergeChatTheme(
        {
          colors: {
            background: c.background,
            assistantBubble: c.card,
            assistantBubbleText: c.textPrimary,
            userBubble: c.accent,
            userBubbleText: '#FFFFFF',
            inputBackground: c.card,
            inputBorder: c.separator,
            inputText: c.textPrimary,
            placeholderText: c.textTertiary,
            sendButton: c.accent,
            sendButtonDisabled: c.separator,
          },
        },
        isDark ? defaultDarkChatTheme : defaultLightChatTheme,
      ),
    [c, isDark],
  );

  const provider: ChatProvider | null = getClientLLMProvider();

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
        <MessageBubble message={item} theme={chatTheme} />
        {showButtons && (
          <View style={styles.yesNoRow}>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                { backgroundColor: c.card },
              ]}
              onPress={() => handleYesNo('Yes')}
              activeOpacity={0.7}
            >
              <Text style={[styles.yesNoText, { color: c.textPrimary }]}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                { backgroundColor: c.card },
              ]}
              onPress={() => handleYesNo('No')}
              activeOpacity={0.7}
            >
              <Text style={[styles.yesNoText, { color: c.textPrimary }]}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Provider may be null if no API key or backend not configured.
  // Playbook flows still work without a provider.

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
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
                  {
                    backgroundColor: c.card,
                    borderColor: c.separator,
                  },
                  action.comingSoon && styles.chipComingSoon,
                ]}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: c.textPrimary },
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
          theme={chatTheme}
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
  yesNoText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipComingSoon: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  chipTextComingSoon: {
    fontStyle: 'italic',
  },
});
