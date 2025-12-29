import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  MapPin,
  Calendar,
  Sparkles,
  CloudSun,
  Bot,
  User,
  Lightbulb,
  Luggage,
  Lock,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Quick action suggestions
const QUICK_ACTIONS = [
  { icon: MapPin, label: 'Best places to visit', prompt: 'What are the best places to visit in Sri Lanka?' },
  { icon: Calendar, label: 'Plan a weekend trip', prompt: 'Help me plan a weekend trip to Kandy' },
  { icon: CloudSun, label: 'Best time to visit', prompt: 'When is the best time to visit Sri Lanka?' },
  { icon: Luggage, label: 'Packing tips', prompt: 'What should I pack for a trip to Sri Lanka?' },
];

/**
 * AI Chat Concierge Component
 * A floating chat assistant powered by Gemini AI
 * - Guests: 3 messages per session (upgrade prompt after)
 * - Authenticated users: 20 messages per day
 */
const AIChatAssistant = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUserStore();
  const { canUseFeature, recordUsage, getRemainingUsage, getMaxUsage, isGuest } = useFeatureAccess();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get current feature access status
  const aiChatAccess = canUseFeature('aiChat');
  const remainingMessages = getRemainingUsage('aiChat');
  const maxMessages = getMaxUsage('aiChat');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Add welcome message when chat first opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const guestInfo = isGuest ? `\n\n💡 You have ${remainingMessages} free messages. Sign in for unlimited access!` : '';
      const authInfo = isAuthenticated ? `\n\n📊 You have ${remainingMessages} messages remaining today.` : '';
      
      const welcomeMessage = {
        id: Date.now(),
        role: 'assistant',
        content: isAuthenticated 
          ? `${t('chat.welcomeAuth', { name: user?.fullName?.split(' ')[0] || 'there' })} 🌴\n\n${t('chat.howCanIHelp')}${authInfo}`
          : `${t('chat.welcome')} 🌴\n\n${t('chat.howCanIHelp')}${guestInfo}`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, isAuthenticated, isGuest, user, t, remainingMessages]);

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    // Check if user can still send messages
    const access = canUseFeature('aiChat');
    if (!access.allowed) {
      if (access.showUpgrade) {
        setShowUpgradePrompt(true);
      } else {
        const limitMessage = {
          id: Date.now(),
          role: 'assistant',
          content: `⚠️ ${access.reason}\n\nYou've reached your daily limit of ${maxMessages} AI messages. This resets at midnight.`,
          isError: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, limitMessage]);
      }
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          userContext: isAuthenticated ? {
            name: user?.fullName,
            preferences: user?.preferences,
          } : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Record usage after successful response
        recordUsage('aiChat');
        const newRemaining = getRemainingUsage('aiChat');

        // Check if guest just used their last message
        const upgradeHint = isGuest && newRemaining === 0 
          ? '\n\n---\n🔓 **Want more?** Sign in for unlimited AI assistance!'
          : '';

        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response + upgradeHint,
          suggestions: data.suggestions || [],
          timestamp: new Date(),
          remaining: newRemaining,
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Show upgrade prompt after last guest message
        if (isGuest && newRemaining === 0) {
          setTimeout(() => setShowUpgradePrompt(true), 2000);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: t('chat.errorMessage'),
        isError: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickAction = (prompt) => {
    sendMessage(prompt);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[1100] w-14 h-14 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center group ${
          isOpen ? 'hidden' : ''
        }`}
        aria-label="Open AI Chat"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-3 h-3" />
        </span>
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {t('chat.askAI')}
        </span>
      </button>

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUpgradePrompt(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white">
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">You're Out of Messages!</h3>
                  <p className="text-sm text-white/80">Unlock unlimited AI assistance</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-gray-600 text-sm mb-4">
                You've used all {maxMessages} free messages. Create a free account to get:
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-2">
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  20 AI messages per day
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  Save trips & itineraries
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  Personalized recommendations
                </li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowUpgradePrompt(false); navigate('/register'); }}
                  className="flex-1 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => { setShowUpgradePrompt(false); navigate('/login'); }}
                  className="flex-1 py-2.5 border-2 border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[1100] w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold font-display">SerendibAI</h3>
                <p className="text-xs text-white/80">{t('chat.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Usage Counter */}
              <div className={`text-xs px-2 py-1 rounded-full ${
                isGuest ? 'bg-amber-400/20 text-amber-100' : 'bg-white/20'
              }`}>
                {remainingMessages}/{maxMessages} {isGuest ? 'free' : 'left'}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Guest Upgrade Banner */}
          {isGuest && remainingMessages > 0 && (
            <div 
              className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between cursor-pointer hover:from-amber-100 hover:to-orange-100"
              onClick={() => navigate('/register')}
            >
              <div className="flex items-center gap-2 text-amber-700 text-xs">
                <Crown className="w-4 h-4" />
                <span>Sign up for 20 messages/day</span>
              </div>
              <span className="text-xs text-amber-600 font-medium">Free →</span>
            </div>
          )}

          {/* Low Usage Warning (for authenticated users) */}
          {isAuthenticated && remainingMessages <= 5 && remainingMessages > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-700 text-xs">
              <AlertCircle className="w-4 h-4" />
              Only {remainingMessages} messages remaining today
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-sand-50 to-white">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-secondary-100 text-secondary-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary-500 text-white rounded-tr-sm'
                      : message.isError
                      ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
                      : 'bg-white shadow-sm border border-gray-100 text-gray-700 rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Suggestions */}
                  {message.suggestions?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => sendMessage(suggestion)}
                          disabled={remainingMessages <= 0}
                          className="block w-full text-left text-xs py-2 px-3 bg-secondary-50 hover:bg-secondary-100 text-secondary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Lightbulb className="w-3 h-3 inline mr-1" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-tl-sm p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-secondary-500" />
                    <span className="text-sm text-gray-500">{t('chat.thinking')}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (only show when few messages and has remaining) */}
          {messages.length <= 1 && !isLoading && remainingMessages > 0 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                {t('chat.quickActions')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="flex items-center gap-2 p-2 text-xs bg-sand-100 hover:bg-sand-200 text-gray-700 rounded-lg transition-colors text-left"
                  >
                    <action.icon className="w-4 h-4 text-secondary-500 flex-shrink-0" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={remainingMessages > 0 ? t('chat.placeholder') : (isGuest ? 'Sign in for more messages' : 'Daily limit reached')}
                disabled={isLoading || remainingMessages <= 0}
                className="flex-1 px-4 py-2.5 bg-sand-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || remainingMessages <= 0}
                className="p-2.5 bg-secondary-500 text-white rounded-xl hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatAssistant;
