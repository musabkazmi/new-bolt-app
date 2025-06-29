import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, Plus, Minus, Trash2, 
  AlertCircle, CheckCircle, Clock, User, MapPin,
  Edit3, DollarSign, Lock, Unlock, ShoppingCart,
  Mic, MicOff, Search, Volume2, Play, Pause
} from 'lucide-react';
import { supabase, Order, OrderItem, MenuItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface OrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOrderUpdated: () => void;
}

interface EditOrderItem extends OrderItem {
  isNew?: boolean;
  isDeleted?: boolean;
}

export default function OrderEditModal({ isOpen, onClose, order, onOrderUpdated }: OrderEditModalProps) {
  const [editData, setEditData] = useState({
    customer_name: '',
    table_number: '',
    status: 'pending' as Order['status']
  });
  const [orderItems, setOrderItems] = useState<EditOrderItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingMenu, setLoadingMenu] = useState(false);
  
  // Voice dictation states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen && order) {
      loadOrderData();
      loadMenuItems();
      checkSpeechSupport();
    }
    return () => {
      stopRecording();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen, order]);

  useEffect(() => {
    // Filter menu items based on search term
    if (searchTerm.trim() === '') {
      setFilteredMenuItems(menuItems);
    } else {
      const filtered = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMenuItems(filtered);
    }
  }, [menuItems, searchTerm]);

  const checkSpeechSupport = () => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechSupported(supported);
    
    if (supported) {
      initializeSpeechRecognition();
    }
  };

  const initializeSpeechRecognition = () => {
    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'de-DE'; // German for better recognition
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          setVoiceNotes(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }
  };

  const startRecording = async () => {
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
      };

      mediaRecorder.start();
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Mikrofonzugriff verweigert. Bitte erlauben Sie den Mikrofonzugriff.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsRecording(false);
  };

  const playAudio = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const loadOrderData = () => {
    if (!order) return;

    setEditData({
      customer_name: order.customer_name || '',
      table_number: order.table_number?.toString() || '',
      status: order.status
    });

    setOrderItems(order.order_items || []);
    setError('');
    setSuccess('');
    setSearchTerm('');
    setVoiceNotes('');
    setTranscript('');
  };

  const loadMenuItems = async () => {
    try {
      setLoadingMenu(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('name');

      if (error) throw error;
      setMenuItems(data || []);
      setFilteredMenuItems(data || []);
    } catch (error) {
      console.error('Error loading menu items:', error);
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const addMenuItem = (menuItem: MenuItem) => {
    const existingItem = orderItems.find(item => 
      item.menu_item_id === menuItem.id && !item.isDeleted
    );

    if (existingItem) {
      setOrderItems(prev => prev.map(item =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: EditOrderItem = {
        id: `new-${Date.now()}`,
        order_id: order?.id || '',
        menu_item_id: menuItem.id,
        quantity: 1,
        price: menuItem.price,
        status: 'pending',
        menu_item: menuItem,
        notes: voiceNotes.trim() || undefined,
        isNew: true
      };
      setOrderItems(prev => [...prev, newItem]);
      setVoiceNotes(''); // Clear voice notes after adding
    }
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, isDeleted: true }
          : item
      ));
    } else {
      setOrderItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const removeItem = (itemId: string) => {
    setOrderItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, isDeleted: true }
        : item
    ));
  };

  const restoreItem = (itemId: string) => {
    setOrderItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, isDeleted: false }
        : item
    ));
  };

  const calculateTotal = () => {
    return orderItems
      .filter(item => !item.isDeleted)
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Generate localized order number in format YYYY/DDD/NNN
  const generateLocalizedOrderNumber = async (order: Order) => {
    if (!order) return '';
    
    try {
      const orderDate = new Date(order.created_at);
      const year = orderDate.getFullYear();
      
      // Calculate day of year (1-366)
      const startOfYear = new Date(year, 0, 0);
      const dayOfYear = Math.floor((orderDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get all orders from the same day to determine sequence number
      const startOfDay = new Date(orderDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(orderDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data: dayOrders, error } = await supabase
        .from('orders')
        .select('id, created_at')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching day orders:', error);
        // Fallback to simple sequence based on order ID
        const orderSequence = parseInt(order.id.slice(-4), 16) % 999 + 1;
        return `${year}/${dayOfYear.toString().padStart(3, '0')}/${orderSequence.toString().padStart(3, '0')}`;
      }
      
      // Find the position of current order in the day's orders
      const orderIndex = dayOrders?.findIndex(o => o.id === order.id) ?? -1;
      const sequenceNumber = orderIndex >= 0 ? orderIndex + 1 : 1;
      
      return `${year}/${dayOfYear.toString().padStart(3, '0')}/${sequenceNumber.toString().padStart(3, '0')}`;
      
    } catch (error) {
      console.error('Error generating order number:', error);
      // Fallback format
      const date = new Date(order.created_at);
      const year = date.getFullYear();
      const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      const orderSequence = parseInt(order.id.slice(-4), 16) % 999 + 1;
      
      return `${year}/${dayOfYear.toString().padStart(3, '0')}/${orderSequence.toString().padStart(3, '0')}`;
    }
  };

  const [localizedOrderNumber, setLocalizedOrderNumber] = useState('');

  useEffect(() => {
    if (order) {
      generateLocalizedOrderNumber(order).then(setLocalizedOrderNumber);
    }
  }, [order]);

  const saveOrder = async () => {
    if (!order || !user) return;

    try {
      setLoading(true);
      setError('');

      const total = calculateTotal();
      const tableNum = editData.table_number ? parseInt(editData.table_number) : null;

      // Update order
      const orderUpdate: any = {
        customer_name: editData.customer_name.trim() || null,
        table_number: tableNum,
        status: editData.status,
        total
      };

      const { error: orderError } = await supabase
        .from('orders')
        .update(orderUpdate)
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Handle order items
      const activeItems = orderItems.filter(item => !item.isDeleted);
      const deletedItems = orderItems.filter(item => item.isDeleted && !item.isNew);
      const newItems = orderItems.filter(item => item.isNew && !item.isDeleted);
      const updatedItems = orderItems.filter(item => !item.isNew && !item.isDeleted);

      // Delete removed items
      if (deletedItems.length > 0) {
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .in('id', deletedItems.map(item => item.id));

        if (deleteError) throw deleteError;
      }

      // Insert new items
      if (newItems.length > 0) {
        const { error: insertError } = await supabase
          .from('order_items')
          .insert(newItems.map(item => ({
            order_id: order.id,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            price: item.price,
            status: item.status,
            notes: item.notes
          })));

        if (insertError) throw insertError;
      }

      // Update existing items
      for (const item of updatedItems) {
        const { error: updateError } = await supabase
          .from('order_items')
          .update({
            quantity: item.quantity,
            price: item.price,
            status: item.status,
            notes: item.notes
          })
          .eq('id', item.id);

        if (updateError) throw updateError;
      }

      setSuccess(t('success.orderUpdated'));
      setTimeout(() => {
        onOrderUpdated();
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('Error updating order:', error);
      setError(error.message || t('error.failedToUpdate'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  const activeItems = orderItems.filter(item => !item.isDeleted);
  const deletedItems = orderItems.filter(item => item.isDeleted);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  Rechnung Nr. {localizedOrderNumber || `${order.id.slice(0, 8)}`}
                </h2>
                <p className="opacity-90">{t('orders.modifyOrderDetails')}</p>
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

        <div className="flex-1 flex overflow-hidden">
          {/* Order Details Section */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              </div>
            )}

            {/* Order Information */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('orders.orderInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    {t('common.customer')} <span className="text-gray-500">({t('common.optional')})</span>
                  </label>
                  <input
                    type="text"
                    value={editData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    placeholder={t('orders.enterCustomerName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {t('common.table')} <span className="text-gray-500">({t('common.optional')})</span>
                  </label>
                  <input
                    type="number"
                    value={editData.table_number}
                    onChange={(e) => handleInputChange('table_number', e.target.value)}
                    placeholder={t('orders.enterTableNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {t('orders.orderStatus')}
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">{t('orders.pending')}</option>
                    <option value="preparing">{t('orders.preparing')}</option>
                    <option value="ready">{t('orders.ready')}</option>
                    <option value="served">{t('orders.served')}</option>
                    <option value="completed">{t('orders.completed')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Voice Dictation Section */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <Volume2 className="w-5 h-5 inline mr-2" />
                Sprachnotizen für neue Artikel
              </h3>
              
              <div className="flex items-center gap-3 mb-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!speechSupported}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Mic className="w-4 h-4" />
                    Aufnahme starten
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <MicOff className="w-4 h-4" />
                    Aufnahme stoppen
                  </button>
                )}

                {audioBlob && (
                  <>
                    {!isPlaying ? (
                      <button
                        onClick={playAudio}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Play className="w-4 h-4" />
                        Abspielen
                      </button>
                    ) : (
                      <button
                        onClick={pauseAudio}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => {
                    setVoiceNotes('');
                    setTranscript('');
                    setAudioBlob(null);
                  }}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Löschen
                </button>
              </div>

              {isRecording && (
                <div className="mb-3 text-sm text-blue-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Hört zu... Sprechen Sie Ihre Notizen
                </div>
              )}

              <textarea
                value={voiceNotes}
                onChange={(e) => setVoiceNotes(e.target.value)}
                placeholder="Sprachnotizen für neue Artikel (werden automatisch hinzugefügt)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />

              {transcript && (
                <div className="mt-2 p-2 bg-white rounded border text-sm">
                  <span className="text-gray-600">Transkript: </span>
                  <span className="italic">"{transcript}"</span>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{t('orders.orderItems')}</h3>
              </div>
              <div className="p-4">
                {activeItems.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {activeItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {item.menu_item?.name || 'Unknown Item'}
                            {item.isNew && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">NEU</span>}
                          </h4>
                          <p className="text-sm text-gray-600">€{item.price.toFixed(2).replace('.', ',')} {t('orders.each')}</p>
                          {item.notes && (
                            <p className="text-sm text-blue-600 italic">Notiz: {item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-bold text-gray-900 w-16 text-right">
                            €{(item.price * item.quantity).toFixed(2).replace('.', ',')}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">{t('orders.noItemsAdded')}</p>
                )}

                {/* Deleted Items */}
                {deletedItems.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{t('orders.removedItems')}</h4>
                    <div className="space-y-2">
                      {deletedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg opacity-60">
                          <span className="text-sm text-gray-600 line-through">
                            {item.quantity}x {item.menu_item?.name} - €{(item.price * item.quantity).toFixed(2).replace('.', ',')}
                          </span>
                          <button
                            onClick={() => restoreItem(item.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {t('orders.restore')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>{t('common.total')}:</span>
                    <span className="text-blue-600">€{calculateTotal().toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add Items Section with Search */}
          <div className="w-96 bg-gray-50 p-4 border-l border-gray-200 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('orders.addItems')}</h3>
            
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Artikel suchen..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {searchTerm && (
                <div className="mt-2 text-sm text-gray-600">
                  {filteredMenuItems.length} von {menuItems.length} Artikeln gefunden
                </div>
              )}
            </div>
            
            {loadingMenu ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMenuItems.length > 0 ? (
                  filteredMenuItems.map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                      <p className="text-xs text-gray-600 mb-1">{item.description}</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {item.category}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          €{item.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <button
                        onClick={() => addMenuItem(item)}
                        className="w-full bg-blue-600 text-white py-2 px-2 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {t('common.add')}
                        {voiceNotes && <span className="text-xs">(mit Notiz)</span>}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      {searchTerm ? 'Keine Artikel gefunden' : 'Keine Artikel verfügbar'}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Suche zurücksetzen
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={saveOrder}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('orders.saveChanges')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}