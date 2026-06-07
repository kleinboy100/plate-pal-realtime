import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playNotification } from '@/lib/notificationSound';

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  sender_type: 'customer' | 'restaurant';
  content: string;
  created_at: string;
  is_read: boolean;
}

interface OrderChatProps {
  orderId: string;
  userType: 'customer' | 'restaurant';
  className?: string;
  defaultOpen?: boolean;
}

export function OrderChat({ orderId, userType, className, defaultOpen = false }: OrderChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Setup presence channel for typing indicators
  useEffect(() => {
    if (orderId && user) {
      const presenceChannel = supabase.channel(`typing-${orderId}`, {
        config: { presence: { key: user.id } }
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          // Check if other party is typing
          const otherTyping = Object.entries(state).some(([key, presences]) => {
            if (key === user.id) return false;
            return (presences as any[]).some(p => p.typing && p.userType !== userType);
          });
          setIsOtherTyping(otherTyping);
        })
        .subscribe();

      presenceChannelRef.current = presenceChannel;

      return () => {
        supabase.removeChannel(presenceChannel);
      };
    }
  }, [orderId, user, userType]);

  useEffect(() => {
    if (orderId) {
      fetchMessages();
      
      // Subscribe to realtime messages
      const channel = supabase
        .channel(`messages-${orderId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${orderId}`
        }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          
          // Show notification if message is from the other party
          if (newMsg.sender_type !== userType) {
            setUnreadCount(prev => prev + 1);
            // Voice alert: "New message received"
            playNotification(`chat-${userType}`, 'New message received');
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Message', {
                body: newMsg.content,
                icon: '/favicon.ico'
              });
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId, userType]);

  const handleTyping = useCallback(() => {
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ typing: true, userType });
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        presenceChannelRef.current?.track({ typing: false, userType });
      }, 2000);
    }
  }, [userType]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      markMessagesAsRead();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    
    setMessages((data as Message[]) || []);
    
    // Count unread messages from other party
    const unread = (data || []).filter(
      (m: Message) => m.sender_type !== userType && !m.is_read
    ).length;
    setUnreadCount(unread);
  };

  const markMessagesAsRead = async () => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('order_id', orderId)
      .neq('sender_type', userType);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) {
      console.log('Cannot send: no message or not logged in', { hasMessage: !!newMessage.trim(), hasUser: !!user });
      return;
    }

    const messageData = {
      order_id: orderId,
      sender_id: user.id,
      sender_type: userType,
      content: newMessage.trim()
    };

    const { error } = await supabase.from('messages').insert(messageData);

    if (error) {
      console.error('Failed to send message:', error);
    } else {
      setNewMessage('');
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <MessageCircle size={18} className="mr-2" />
        Chat
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed inset-x-4 bottom-20 md:absolute md:inset-auto md:top-full md:right-0 md:left-auto md:bottom-auto md:mt-2 w-auto md:w-72 max-w-[calc(100vw-2rem)] bg-card border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b flex justify-between items-center">
            <span className="font-semibold text-sm">Order Chat</span>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              ×
            </Button>
          </div>
          
          <div className="h-56 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] p-2 rounded-lg text-sm",
                    msg.sender_type === userType
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
            {isOtherTyping && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{userType === 'customer' ? 'Restaurant' : 'Customer'} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-3 border-t flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message..."
              className="flex-1 h-9 min-w-0"
            />
            <Button type="submit" size="sm" className="shrink-0" disabled={!newMessage.trim()}>
              <Send size={16} />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}