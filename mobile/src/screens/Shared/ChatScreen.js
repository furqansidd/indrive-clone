import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { getSocket } from '../../api/socket';

export default function ChatScreen({ route, navigation }) {
  const { rideId, otherName } = route.params;
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const flatListRef = useRef(null);

  // Set the title of the screen to the other party's name
  useEffect(() => {
    navigation.setOptions({ title: `Chat with ${otherName || 'User'}` });
  }, [otherName]);

  // Load chat history & listen for socket messages
  useEffect(() => {
    fetchChatHistory();

    const socket = getSocket();
    socket.emit('join:ride', rideId);

    // Listen for new messages
    socket.on('ride:message', (msg) => {
      setMessages((prev) => {
        // Avoid duplicate messages if socket & rest somehow double-trigger
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.off('ride:message');
    };
  }, [rideId]);

  const fetchChatHistory = async () => {
    try {
      const { data } = await api.get(`/rides/${rideId}/messages`);
      setMessages(data);
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (text.trim() === '') return;
    
    const socket = getSocket();
    socket.emit('ride:message', {
      rideId,
      from: user.role, // 'rider' | 'driver'
      text: text.trim(),
    });
    
    setText('');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={{ marginTop: 10 }}>Loading chat history…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || index.toString()}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            // Check if the message was sent by the current user
            const isMe = item.from === user.role;
            return (
              <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                  <Text style={[styles.text, isMe ? styles.myText : styles.otherText]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.time, isMe ? styles.myTime : styles.otherTime]}>
                    {new Date(item.createdAt || Date.now()).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  listContent: { padding: 16 },
  messageRow: { flexDirection: 'row', marginBottom: 12, width: '100%' },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#ffde00',
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 2,
  },
  text: { fontSize: 14, color: '#333', lineHeight: 18 },
  myText: { color: '#000' },
  otherText: { color: '#222' },
  time: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: '#555' },
  otherTime: { color: '#999' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fafafa',
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
