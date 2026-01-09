import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { formatTime, getInitials } from '../../utils/helpers';
import { getSocket, joinGroup, leaveGroup, sendMessage, sendTyping, isSocketConnected, initializeSocket } from '../../services/socketService';
import { wp, hp, scaleSize } from '../../utils/responsive';

export default function ChatScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadMessages();
    
    // Initialize socket if not connected
    const initSocketAndJoin = async () => {
      if (!isSocketConnected()) {
        console.log('Socket not connected, initializing...');
        await initializeSocket();
      }
      
      // Wait for socket to be ready
      const checkConnection = setInterval(() => {
        const currentSocket = getSocket();
        if (currentSocket?.connected) {
          console.log('Socket connected, joining group:', groupId);
          joinGroup(groupId);
          setupSocketListeners();
          clearInterval(checkConnection);
        }
      }, 500);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkConnection);
        if (!isSocketConnected()) {
          console.error('Socket connection timeout');
          Alert.alert('Connection Error', 'Unable to connect to chat server. Please try again.');
        }
      }, 10000);
      
      return () => {
        clearInterval(checkConnection);
      };
    };
    
    initSocketAndJoin();

    return () => {
      // Cleanup socket listeners
      const currentSocket = getSocket();
      if (currentSocket) {
        currentSocket.off('new_message');
        currentSocket.off('message_edited');
        currentSocket.off('message_deleted');
        currentSocket.off('user_typing');
        currentSocket.off('error');
      }
      // Leave group room when component unmounts
      if (isSocketConnected()) {
        leaveGroup(groupId);
      }
    };
  }, [groupId]);

  const loadMessages = async () => {
    try {
      const response = await chatAPI.getMessages(groupId, 1, 50);
      if (response.success) {
        setMessages(response.messages || []);
        // Scroll to bottom after messages load
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for new messages
    socket.on('new_message', (data) => {
      if (data.message && data.message.groupId?.toString() === groupId.toString()) {
        setMessages(prev => [...prev, data.message]);
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    // Listen for message edits
    socket.on('message_edited', (data) => {
      if (data.message && data.message.groupId?.toString() === groupId.toString()) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === data.message._id ? data.message : msg
          )
        );
      }
    });

    // Listen for message deletions
    socket.on('message_deleted', (data) => {
      if (data.groupId?.toString() === groupId.toString()) {
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      }
    });

    // Listen for typing indicators
    socket.on('user_typing', (data) => {
      if (data.groupId?.toString() === groupId.toString() && data.userId !== user?._id) {
        if (data.isTyping) {
          setTypingUsers(prev => new Set([...prev, data.userId]));
        } else {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
        }
      }
    });

    // Listen for errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    });
  };

  const handleSend = async () => {
    const message = inputText.trim();
    if (!message || sending) return;

    setSending(true);
    setInputText('');

    // Stop typing indicator
    const socket = getSocket();
    if (socket?.connected) {
      sendTyping(groupId, false);
    }

    try {
      const success = sendMessage(groupId, message);
      if (!success) {
        Alert.alert('Error', 'Failed to send message. Please check your connection.');
        setInputText(message); // Restore message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setInputText(message); // Restore message
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text) => {
    setInputText(text);

    // Send typing indicator
    const socket = getSocket();
    if (socket?.connected && text.length > 0) {
      sendTyping(groupId, true);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(groupId, false);
      }, 2000);
    } else if (socket?.connected) {
      sendTyping(groupId, false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId?._id?.toString() === user?._id?.toString();
    const senderName = item.senderId?.name || 'Unknown';
    const senderAvatar = item.senderId?.avatar;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isMyMessage && (
          <View style={styles.messageAvatar}>
            {senderAvatar ? (
              <Image source={{ uri: senderAvatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(senderName)}</Text>
            )}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {!isMyMessage && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.messageImage} />
          ) : null}
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
              {formatTime(item.createdAt)}
            </Text>
            {item.isEdited && (
              <Text style={[styles.editedLabel, isMyMessage && styles.myEditedLabel]}>
                (edited)
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Chat</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="message-text-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      {typingUsers.size > 0 && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>
            {Array.from(typingUsers).length} {Array.from(typingUsers).length === 1 ? 'person' : 'people'} typing...
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={handleTyping}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Icon name="send" size={20} color={colors.background} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: scaleSize(32),
    height: scaleSize(32),
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.round,
  },
  avatarText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.background,
  },
  messageBubble: {
    maxWidth: wp(75),
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  otherMessageBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: spacing.xs,
  },
  senderName: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs / 2,
  },
  messageText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  myMessageText: {
    color: colors.background,
  },
  messageImage: {
    width: wp(60),
    height: hp(20),
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    resizeMode: 'cover',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  messageTime: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
  },
  myMessageTime: {
    color: colors.background,
    opacity: 0.8,
  },
  editedLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
    fontStyle: 'italic',
  },
  myEditedLabel: {
    color: colors.background,
    opacity: 0.8,
  },
  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typingText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
    maxHeight: hp(20),
    minHeight: 44,
  },
  sendButton: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textTertiary,
  },
});

