import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Play, Pause, RotateCcw, Send, 
  AlertCircle, CheckCircle, Volume2, Loader, 
  ShoppingCart, User, MapPin, Utensils, RefreshCw
} from 'lucide-react';
import { supabase, MenuItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { aiChatBackend } from '../lib/aiChatBackend';

interface VoiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: () => void;
}

interface ParsedOrderItem {
  name: string;
  quantity: number;
  notes?: string;
  menuItem?: MenuItem;
}

interface ParsedOrder {
  customerName?: string;
  tableNumber?: number;
  items: ParsedOrderItem[];
  specialInstructions?: string;
}

export default function VoiceOrderModal({ isOpen, onClose, onOrderPlaced }: VoiceOrderModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      loadMenuItems();
      checkSpeechSupport();
      resetForm();
    }
    return () => {
      stopRecording();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen]);

  const checkSpeechSupport = () => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechSupported(supported);
    
    if (supported) {
      initializeSpeechRecognition();
    } else {
      setError(t('voice.speechRecognitionNotSupported'));
    }
  };

  const loadMenuItems = async () => {
    try {
      console.log('Loading menu items for voice order...');
      setError(''); // Clear any previous errors
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('name');

      if (error) {
        console.error('Error loading menu items:', error);
        throw new Error(`${t('error.failedToLoad')}: ${error.message}`);
      }
      
      console.log('Menu items loaded:', data?.length || 0);
      setMenuItems(data || []);
      
      if (!data || data.length === 0) {
        setError(t('error.noMenuItems'));
      }
    } catch (error: any) {
      console.error('Error loading menu items:', error);
      setError(error.message || t('error.failedToLoad'));
    }
  };

  const initializeSpeechRecognition = () => {
    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
        setError('');
      };

      recognition.onresult = (event) => {
        console.log('Speech recognition result:', event);
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => {
            const newTranscript = prev + finalTranscript;
            console.log('Updated transcript:', newTranscript);
            return newTranscript;
          });
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event);
        let errorMessage = t('voice.speechRecognitionError');
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = t('voice.microphoneRequired');
            break;
          case 'no-speech':
            errorMessage = t('voice.noSpeechDetected');
            break;
          case 'audio-capture':
            errorMessage = t('voice.noMicrophoneFound');
            break;
          case 'network':
            errorMessage = t('error.networkError');
            break;
          default:
            errorMessage = `${t('voice.speechRecognitionError')}: ${event.error}`;
        }
        
        setError(errorMessage);
        setIsRecording(false);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      console.log('Speech recognition initialized successfully');
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setError(t('voice.failedToInitialize'));
    }
  };

  const resetForm = () => {
    setTranscript('');
    setParsedOrder(null);
    setError('');
    setSuccess('');
    setAudioBlob(null);
    setCustomerName('');
    setTableNumber('');
    setIsProcessing(false);
    setIsCreatingOrder(false);
    setIsRecording(false);
    setIsPlaying(false);
  };

  const requestMicrophonePermission = async () => {
    try {
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      setError('');
      console.log('Microphone permission granted');
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('Microphone permission denied:', error);
      setPermissionGranted(false);
      setError(t('voice.microphoneRequired'));
      return false;
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');
      
      if (!speechSupported) {
        setError(t('voice.speechRecognitionNotSupported'));
        return;
      }

      // Request microphone permission first
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }

      console.log('Starting voice recording...');
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        console.log('Speech recognition started');
      } else {
        throw new Error('Speech recognition not initialized');
      }

      // Also start audio recording for backup/playback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          setAudioBlob(audioBlob);
          stream.getTracks().forEach(track => track.stop());
          console.log('Audio recording stopped, blob created');
        };

        mediaRecorder.start();
        console.log('Audio recording started');
      } catch (audioError) {
        console.warn('Audio recording failed, but speech recognition may still work:', audioError);
      }

    } catch (error: any) {
      console.error('Error starting recording:', error);
      setError(error.message || t('voice.failedToStartRecording'));
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('Speech recognition stopped');
      } catch (error) {
        console.warn('Error stopping speech recognition:', error);
      }
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        console.log('Audio recording stopped');
      } catch (error) {
        console.warn('Error stopping audio recording:', error);
      }
    }
    
    setIsRecording(false);
  };

  const playAudio = () => {
    if (audioBlob) {
      try {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          setError(t('voice.failedToPlayAudio'));
        };
        
        audio.play();
      } catch (error) {
        console.error('Error playing audio:', error);
        setError(t('voice.failedToPlayAudio'));
      }
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const processVoiceOrder = async () => {
    if (!transcript.trim()) {
      setError(t('voice.noSpeechDetected'));
      return;
    }

    if (menuItems.length === 0) {
      setError(t('voice.noMenuItemsAvailable'));
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      console.log('Processing voice order with transcript:', transcript);
      console.log('Available menu items:', menuItems.length);

      // Create a more robust prompt for the AI
      const menuItemsList = menuItems.map(item => 
        `"${item.name}" - $${item.price.toFixed(2)} (${item.category})`
      ).join('\n');

      const prompt = `You are a restaurant order processing AI. Parse this voice order transcript and extract structured information.

TRANSCRIPT: "${transcript}"

AVAILABLE MENU ITEMS:
${menuItemsList}

INSTRUCTIONS:
1. Extract customer name if mentioned (optional - can be null)
2. Extract table number if mentioned (optional - can be null)  
3. Identify ordered items and quantities
4. Match items to the exact menu item names provided above
5. Extract any special instructions or notes
6. If an item is mentioned but not on the menu, include it anyway but note it

RESPOND WITH VALID JSON ONLY:
{
  "customerName": "name or null",
  "tableNumber": number or null,
  "items": [
    {
      "name": "exact menu item name from list above",
      "quantity": number,
      "notes": "special instructions or null"
    }
  ],
  "specialInstructions": "general order notes or null"
}

IMPORTANT: 
- Use exact menu item names from the list above
- Customer name and table number are optional
- Quantity must be a positive number
- Return only valid JSON, no other text`;

      console.log('Sending prompt to AI backend...');
      const response = await aiChatBackend.sendMessage(prompt, user?.id || 'voice-order');

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('AI response received:', response.answer);

      // Try to parse the AI response as JSON
      let parsed: ParsedOrder;
      try {
        // Clean the response and extract JSON
        let jsonStr = response.answer.trim();
        
        // Remove any markdown code blocks
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Find JSON object in the response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
        
        console.log('Attempting to parse JSON:', jsonStr);
        parsed = JSON.parse(jsonStr);
        console.log('Successfully parsed order:', parsed);
        
        // Validate the parsed order
        if (!parsed.items || !Array.isArray(parsed.items)) {
          throw new Error(t('voice.invalidOrderFormat'));
        }
        
        if (parsed.items.length === 0) {
          throw new Error(t('voice.noItemsFound'));
        }
        
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', response.answer);
        console.error('Parse error:', parseError);
        throw new Error(t('voice.speakClearlyTryAgain'));
      }

      // Match parsed items with actual menu items
      const matchedItems = parsed.items.map(item => {
        // First try exact match
        let menuItem = menuItems.find(mi => 
          mi.name.toLowerCase() === item.name.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!menuItem) {
          menuItem = menuItems.find(mi => 
            mi.name.toLowerCase().includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(mi.name.toLowerCase())
          );
        }
        
        // If still no match, try fuzzy matching on keywords
        if (!menuItem) {
          const itemWords = item.name.toLowerCase().split(' ');
          menuItem = menuItems.find(mi => {
            const menuWords = mi.name.toLowerCase().split(' ');
            return itemWords.some(word => 
              menuWords.some(menuWord => 
                menuWord.includes(word) || word.includes(menuWord)
              )
            );
          });
        }
        
        console.log(`Matching "${item.name}" with menu item:`, menuItem?.name || 'No match found');
        
        return {
          ...item,
          menuItem
        };
      });

      // Check if we found any valid menu items
      const validItems = matchedItems.filter(item => item.menuItem);
      if (validItems.length === 0) {
        throw new Error(t('voice.noValidMenuItems'));
      }

      setParsedOrder({
        ...parsed,
        items: matchedItems
      });

      // Pre-fill customer name and table if detected
      if (parsed.customerName) {
        setCustomerName(parsed.customerName);
      }
      if (parsed.tableNumber) {
        setTableNumber(parsed.tableNumber.toString());
      }

      setSuccess(`${t('voice.orderParsedSuccessfully')} ${t('voice.reviewAndConfirm')}`);

    } catch (error: any) {
      console.error('Error processing voice order:', error);
      setError(error.message || t('voice.failedToProcessOrder'));
    } finally {
      setIsProcessing(false);
    }
  };

  const generateGuestName = () => {
    const guestNumber = Math.floor(Math.random() * 9999) + 1;
    return `${t('common.guest')} ${guestNumber}`;
  };

  const createOrder = async () => {
    if (!parsedOrder || !user) {
      setError(t('voice.noOrderToCreate'));
      return;
    }

    const validItems = parsedOrder.items.filter(item => item.menuItem);
    if (validItems.length === 0) {
      setError(t('voice.noValidMenuItemsFound'));
      return;
    }

    try {
      setIsCreatingOrder(true);
      setError('');

      console.log('Creating voice order with items:', validItems);

      const total = validItems.reduce((sum, item) => 
        sum + (item.menuItem!.price * item.quantity), 0
      );

      const tableNum = tableNumber ? parseInt(tableNumber) : null;
      if (tableNumber && (isNaN(tableNum) || tableNum <= 0)) {
        setError(t('orders.validTableNumber'));
        setIsCreatingOrder(false);
        return;
      }

      // Generate guest name if customer name is empty
      const finalCustomerName = customerName.trim() || generateGuestName();

      console.log('Order details:', {
        customerName: finalCustomerName,
        tableNumber: tableNum,
        total,
        itemCount: validItems.length
      });

      // Create the order
      const orderData = {
        customer_id: user.role === 'customer' ? user.id : null,
        waiter_id: user.role === 'waiter' || user.role === 'manager' ? user.id : null,
        table_number: tableNum,
        customer_name: finalCustomerName,
        status: 'pending' as const,
        total: total,
      };

      console.log('Inserting order:', orderData);

      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw new Error(`${t('error.failedToCreate')}: ${orderError.message}`);
      }

      console.log('Order created successfully:', createdOrder);

      // Create order items with special instructions in notes
      const orderItemsData = validItems.map(item => ({
        order_id: createdOrder.id,
        menu_item_id: item.menuItem!.id,
        quantity: item.quantity,
        price: item.menuItem!.price,
        notes: item.notes || parsedOrder.specialInstructions || `${t('voice.voiceOrder')}: "${transcript.slice(0, 100)}${transcript.length > 100 ? '...' : ''}"`,
        status: 'pending' as const
      }));

      console.log('Inserting order items:', orderItemsData);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        throw new Error(`${t('error.failedToAddItems')}: ${itemsError.message}`);
      }

      console.log('Voice order created successfully!');

      setSuccess(`${t('voice.voiceOrderCreated')} ${t('orders.orderNumber')}${createdOrder.id.slice(0, 8)} - ${t('common.total')}: $${total.toFixed(2)}`);
      
      setTimeout(() => {
        onOrderPlaced();
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('Error creating order:', error);
      setError(error.message || t('error.failedToCreate'));
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const calculateTotal = () => {
    if (!parsedOrder) return 0;
    return parsedOrder.items
      .filter(item => item.menuItem)
      .reduce((total, item) => total + (item.menuItem!.price * item.quantity), 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('voice.title')}</h2>
                <p className="opacity-90">{t('voice.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <p className="text-red-700">{error}</p>
                  {error.includes(t('voice.microphoneRequired')) && (
                    <button
                      onClick={requestMicrophonePermission}
                      className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      {t('voice.grantMicrophoneAccess')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* Browser Compatibility Check */}
          {!speechSupported && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-orange-700 font-medium">{t('voice.speechRecognitionNotSupported')}</p>
                  <p className="text-orange-600 text-sm">{t('voice.useChromeEdgeSafari')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Menu Items Status */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  {t('voice.menuStatus')}: {menuItems.length} {t('voice.itemsLoaded')}
                </span>
              </div>
              <button
                onClick={loadMenuItems}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <RefreshCw className="w-3 h-3" />
                {t('common.refresh')}
              </button>
            </div>
          </div>

          {/* Voice Recording Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('voice.step1')}</h3>
            
            <div className="text-center">
              <div className={`w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-100 border-4 border-red-300 animate-pulse' 
                  : 'bg-purple-100 border-4 border-purple-300'
              }`}>
                {isRecording ? (
                  <MicOff className="w-12 h-12 text-red-600" />
                ) : (
                  <Mic className="w-12 h-12 text-purple-600" />
                )}
              </div>

              <div className="flex justify-center gap-4 mb-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!speechSupported || menuItems.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mic className="w-5 h-5" />
                    {t('voice.startRecording')}
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <MicOff className="w-5 h-5" />
                    {t('voice.stopRecording')}
                  </button>
                )}

                {audioBlob && (
                  <>
                    {!isPlaying ? (
                      <button
                        onClick={playAudio}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        {t('voice.play')}
                      </button>
                    ) : (
                      <button
                        onClick={pauseAudio}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Pause className="w-5 h-5" />
                        {t('voice.pause')}
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  {t('voice.reset')}
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {isRecording 
                  ? t('voice.listening')
                  : speechSupported
                    ? t('voice.clickStartRecording')
                    : t('voice.speechNotSupported')
                }
              </p>

              <div className="text-xs text-gray-500 bg-white p-3 rounded-lg">
                <p className="font-medium mb-1">{t('voice.exampleOrders')}</p>
                <p>{t('voice.example1')}</p>
                <p>{t('voice.example2')}</p>
                <p>{t('voice.example3')} <span className="text-green-600">({t('voice.anonymousOrder')})</span></p>
              </div>
            </div>
          </div>

          {/* Transcript Section */}
          {transcript && (
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('voice.step2')}</h3>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Volume2 className="w-5 h-5 text-blue-600 mt-1" />
                  <p className="text-gray-800 italic">"{transcript}"</p>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <button
                  onClick={processVoiceOrder}
                  disabled={isProcessing || menuItems.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mx-auto"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {t('voice.processing')}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {t('voice.processOrder')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Parsed Order Section */}
          {parsedOrder && (
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('voice.step3')}</h3>
              
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    {t('voice.customerNameOptional')}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('orders.enterCustomerName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {t('voice.tableNumberOptional')}
                  </label>
                  <input
                    type="number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder={t('orders.enterTableNumber')}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg border border-green-200 p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">{t('voice.orderItems')}</h4>
                <div className="space-y-3">
                  {parsedOrder.items.map((item, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      item.menuItem 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-orange-200 bg-orange-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.quantity}x {item.menuItem?.name || item.name}
                            </span>
                            {!item.menuItem && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                {t('voice.notOnMenu')}
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-sm text-gray-600 italic">{t('common.notes')}: {item.notes}</p>
                          )}
                          {item.menuItem && (
                            <p className="text-sm text-gray-500">${item.menuItem.price.toFixed(2)} {t('orders.each')}</p>
                          )}
                        </div>
                        {item.menuItem && (
                          <span className="font-bold text-green-600">
                            ${(item.menuItem.price * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {parsedOrder.specialInstructions && (
                <div className="bg-white rounded-lg border border-green-200 p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">{t('voice.specialInstructions')}</h4>
                  <p className="text-gray-700">{parsedOrder.specialInstructions}</p>
                </div>
              )}

              {/* Total */}
              <div className="bg-white rounded-lg border border-green-200 p-4 mb-6">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>{t('common.total')}:</span>
                  <span className="text-green-600">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Create Order Button */}
              <div className="text-center">
                <button
                  onClick={createOrder}
                  disabled={isCreatingOrder || calculateTotal() === 0}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 mx-auto"
                >
                  {isCreatingOrder ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {t('voice.creating')}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      {t('voice.createOrder')} (${calculateTotal().toFixed(2)})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}