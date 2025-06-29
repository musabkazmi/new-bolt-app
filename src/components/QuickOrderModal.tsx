import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Play, Pause, RotateCcw, Send, 
  AlertCircle, CheckCircle, Volume2, Loader, 
  ShoppingCart, User, MapPin, Utensils, RefreshCw,
  FileText, Download, Mail, Calculator, Receipt,
  QrCode, Building, Phone, Globe, Euro, Settings
} from 'lucide-react';
import { supabase, MenuItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { aiChatBackend } from '../lib/aiChatBackend';
import { generateInvoicePDF, sendInvoiceEmail, generateDATEVExport } from '../lib/invoiceSystem';
import CompanySettingsModal from './CompanySettingsModal';

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: () => void;
}

interface ParsedOrderItem {
  name: string;
  quantity: number;
  notes?: string;
  menuItem?: MenuItem;
  unitPrice: number;
  totalPrice: number;
  vatRate: number;
  vatAmount: number;
}

interface ParsedOrder {
  customerName?: string;
  tableNumber?: number;
  items: ParsedOrderItem[];
  specialInstructions?: string;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  tableNumber?: number;
  items: ParsedOrderItem[];
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  qrCode?: string;
  notes?: string;
}

interface CompanyData {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  taxNumber: string;
  vatId: string;
}

export default function QuickOrderModal({ isOpen, onClose, onOrderPlaced }: QuickOrderModalProps) {
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
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isExportingDATEV, setIsExportingDATEV] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: "RestaurantOS GmbH",
    address: "Musterstraße 123",
    city: "12345 Musterstadt",
    phone: "+49 123 456789",
    email: "info@restaurantos.de",
    website: "www.restaurantos.de",
    taxNumber: "DE123456789",
    vatId: "DE987654321"
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  // Tax accountant email
  const accountantEmail = "buchhaltung@kanzlei.de";
  const ccEmail = "info@meinbetrieb.de";

  useEffect(() => {
    if (isOpen) {
      loadMenuItems();
      loadCompanyData();
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

  const loadCompanyData = () => {
    const savedData = localStorage.getItem('company-settings');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setCompanyData(parsed);
      } catch (error) {
        console.error('Error loading company data:', error);
      }
    }
  };

  const handleCompanyDataSave = (newCompanyData: CompanyData) => {
    setCompanyData(newCompanyData);
    setShowCompanySettings(false);
  };

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
      console.log('Loading menu items for quick voice order...');
      setError('');
      
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
      recognition.lang = 'de-DE'; // German for better recognition
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
    setInvoiceData(null);
  };

  const requestMicrophonePermission = async () => {
    try {
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      setError('');
      console.log('Microphone permission granted');
      
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

      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }

      console.log('Starting voice recording...');
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
        console.log('Speech recognition started');
      } else {
        throw new Error('Speech recognition not initialized');
      }

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

      const menuItemsList = menuItems.map(item => 
        `"${item.name}" - €${item.price.toFixed(2)} (${item.category})`
      ).join('\n');

      const prompt = `Du bist ein KI-System für Restaurantbestellungen. Analysiere diese Sprachbestellung und extrahiere strukturierte Informationen.

TRANSKRIPT: "${transcript}"

VERFÜGBARE MENÜPUNKTE:
${menuItemsList}

ANWEISUNGEN:
1. Extrahiere Kundenname falls erwähnt (optional - kann null sein)
2. Extrahiere Tischnummer falls erwähnt (optional - kann null sein)  
3. Identifiziere bestellte Artikel und Mengen
4. Ordne Artikel den exakten Menüpunkt-Namen von oben zu
5. Extrahiere besondere Anweisungen oder Notizen
6. Berechne Preise mit 19% MwSt (im Preis enthalten)
7. Falls ein Artikel erwähnt aber nicht auf der Speisekarte ist, trotzdem aufnehmen aber markieren

ANTWORTE NUR MIT GÜLTIGEM JSON:
{
  "customerName": "Name oder null",
  "tableNumber": Zahl oder null,
  "items": [
    {
      "name": "exakter Menüpunkt-Name von der Liste oben",
      "quantity": Zahl,
      "notes": "besondere Anweisungen oder null",
      "unitPrice": Preis pro Stück,
      "vatRate": 19,
      "vatAmount": MwSt-Betrag,
      "totalPrice": Gesamtpreis für diesen Artikel
    }
  ],
  "specialInstructions": "allgemeine Bestellnotizen oder null",
  "subtotal": Zwischensumme,
  "totalVat": Gesamt-MwSt,
  "grandTotal": Gesamtbetrag
}

WICHTIG: 
- Verwende exakte Menüpunkt-Namen von der Liste oben
- Kundenname und Tischnummer sind optional
- Menge muss eine positive Zahl sein
- Alle Preise in Euro
- MwSt ist im Preis enthalten (19%)
- Gib nur gültiges JSON zurück, keinen anderen Text`;

      console.log('Sending prompt to AI backend...');
      const response = await aiChatBackend.sendMessage(prompt, user?.id || 'quick-voice-order');

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('AI response received:', response.answer);

      let parsed: ParsedOrder;
      try {
        let jsonStr = response.answer.trim();
        jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
        
        console.log('Attempting to parse JSON:', jsonStr);
        parsed = JSON.parse(jsonStr);
        console.log('Successfully parsed order:', parsed);
        
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
        let menuItem = menuItems.find(mi => 
          mi.name.toLowerCase() === item.name.toLowerCase()
        );
        
        if (!menuItem) {
          menuItem = menuItems.find(mi => 
            mi.name.toLowerCase().includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(mi.name.toLowerCase())
          );
        }
        
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
        
        // Calculate VAT and prices
        const unitPrice = menuItem ? menuItem.price : item.unitPrice || 0;
        const totalPrice = unitPrice * item.quantity;
        const vatAmount = totalPrice * 0.19 / 1.19; // VAT included in price
        
        return {
          ...item,
          menuItem,
          unitPrice,
          totalPrice,
          vatRate: 19,
          vatAmount
        };
      });

      const validItems = matchedItems.filter(item => item.menuItem);
      if (validItems.length === 0) {
        throw new Error(t('voice.noValidMenuItems'));
      }

      // Recalculate totals
      const subtotal = matchedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalVat = matchedItems.reduce((sum, item) => sum + item.vatAmount, 0);

      setParsedOrder({
        ...parsed,
        items: matchedItems,
        subtotal,
        totalVat,
        grandTotal: subtotal
      });

      if (parsed.customerName) {
        setCustomerName(parsed.customerName);
      }
      if (parsed.tableNumber) {
        setTableNumber(parsed.tableNumber.toString());
      }

      setSuccess(t('voice.orderParsedSuccessfully') + ' ' + t('voice.reviewAndConfirm'));

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

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0');
    return `RG-${year}${month}${day}-${time}`;
  };

  const createOrderAndInvoice = async () => {
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

      console.log('Creating quick voice order with items:', validItems);

      const tableNum = tableNumber ? parseInt(tableNumber) : null;
      if (tableNumber && (isNaN(tableNum) || tableNum <= 0)) {
        setError(t('orders.validTableNumber'));
        setIsCreatingOrder(false);
        return;
      }

      const finalCustomerName = customerName.trim() || generateGuestName();

      // Create the order
      const orderData = {
        customer_id: user.role === 'customer' ? user.id : null,
        waiter_id: user.role === 'waiter' || user.role === 'manager' ? user.id : null,
        table_number: tableNum,
        customer_name: finalCustomerName,
        status: 'pending' as const,
        total: parsedOrder.grandTotal,
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
        price: item.unitPrice,
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

      console.log('Quick voice order created successfully!');

      // Generate invoice data
      const invoiceNumber = generateInvoiceNumber();
      const invoiceDate = new Date().toLocaleDateString('de-DE');
      
      const invoice: InvoiceData = {
        invoiceNumber,
        date: invoiceDate,
        customerName: finalCustomerName,
        tableNumber: tableNum || undefined,
        items: validItems,
        subtotal: parsedOrder.subtotal,
        totalVat: parsedOrder.totalVat,
        grandTotal: parsedOrder.grandTotal,
        notes: parsedOrder.specialInstructions
      };

      setInvoiceData(invoice);
      setSuccess(`${t('voice.voiceOrderCreated')} ${t('orders.orderNumber')}${createdOrder.id.slice(0, 8)} - ${t('common.total')}: €${parsedOrder.grandTotal.toFixed(2)}`);

    } catch (error: any) {
      console.error('Error creating order:', error);
      setError(error.message || t('error.failedToCreate'));
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceData) return;

    try {
      setIsGeneratingInvoice(true);
      console.log('Generating PDF invoice...');

      const pdfBlob = await generateInvoicePDF(invoiceData, companyData);
      
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rechnung-${invoiceData.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(t('quickOrder.invoiceGenerated'));
    } catch (error) {
      console.error('Error generating invoice:', error);
      setError(t('quickOrder.invoiceGenerationError'));
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoiceData) return;

    try {
      setIsSendingEmail(true);
      console.log('Sending invoice email...');

      await sendInvoiceEmail(invoiceData, companyData, accountantEmail, ccEmail);
      setSuccess(t('quickOrder.invoiceEmailSent'));
    } catch (error) {
      console.error('Error sending email:', error);
      setError(t('quickOrder.emailSendingError'));
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDATEVExport = async () => {
    if (!invoiceData) return;

    try {
      setIsExportingDATEV(true);
      console.log('Generating DATEV export...');

      const csvBlob = await generateDATEVExport([invoiceData]);
      
      // Download the CSV
      const url = URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DATEV-Export-${invoiceData.date.replace(/\./g, '')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(t('quickOrder.datevExportGenerated'));
    } catch (error) {
      console.error('Error generating DATEV export:', error);
      setError(t('quickOrder.datevExportError'));
    } finally {
      setIsExportingDATEV(false);
    }
  };

  const calculateTotal = () => {
    if (!parsedOrder) return 0;
    return parsedOrder.grandTotal;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('quickOrder.title')}</h2>
                <p className="opacity-90">{t('quickOrder.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompanySettings(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={t('quickOrder.editCompanyInfo')}
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
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

          {/* Company Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">{t('quickOrder.companyInfo')}</span>
              </div>
              <button
                onClick={() => setShowCompanySettings(true)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <Settings className="w-3 h-3" />
                {t('common.edit')}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">{companyData.name}</p>
                <p>{companyData.address}</p>
                <p>{companyData.city}</p>
              </div>
              <div>
                <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {companyData.phone}</p>
                <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {companyData.email}</p>
                <p className="flex items-center gap-1"><Globe className="w-3 h-3" /> {companyData.website}</p>
              </div>
            </div>
          </div>

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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quickOrder.step1')}</h3>
            
            <div className="text-center">
              <div className={`w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-100 border-4 border-red-300 animate-pulse' 
                  : 'bg-emerald-100 border-4 border-emerald-300'
              }`}>
                {isRecording ? (
                  <MicOff className="w-12 h-12 text-red-600" />
                ) : (
                  <Mic className="w-12 h-12 text-emerald-600" />
                )}
              </div>

              <div className="flex justify-center gap-4 mb-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!speechSupported || menuItems.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    ? t('quickOrder.startRecordingPrompt')
                    : t('voice.speechNotSupported')
                }
              </p>

              <div className="text-xs text-gray-500 bg-white p-3 rounded-lg">
                <p className="font-medium mb-1">{t('voice.exampleOrders')}:</p>
                <p>{t('quickOrder.example1')}</p>
                <p>{t('quickOrder.example2')}</p>
                <p>{t('quickOrder.example3')}</p>
              </div>
            </div>
          </div>

          {/* Transcript Section */}
          {transcript && (
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quickOrder.step2')}</h3>
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
                      {t('quickOrder.processWithAI')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Parsed Order Section */}
          {parsedOrder && (
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quickOrder.step3')}</h3>
              
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    {t('quickOrder.customerNameOptional')}
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
                    {t('quickOrder.tableNumberOptional')}
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
                <h4 className="font-medium text-gray-900 mb-3">{t('quickOrder.orderItems')}:</h4>
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
                            <div className="text-sm text-gray-500 mt-1">
                              <p>€{item.unitPrice.toFixed(2)} {t('orders.each')}</p>
                              <p>{t('quickOrder.vat')} (19%): €{item.vatAmount.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                        {item.menuItem && (
                          <div className="text-right">
                            <span className="font-bold text-green-600 text-lg">
                              €{item.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {parsedOrder.specialInstructions && (
                <div className="bg-white rounded-lg border border-green-200 p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">{t('voice.specialInstructions')}:</h4>
                  <p className="text-gray-700">{parsedOrder.specialInstructions}</p>
                </div>
              )}

              {/* Total Calculation */}
              <div className="bg-white rounded-lg border border-green-200 p-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>{t('quickOrder.subtotal')}:</span>
                    <span>€{(parsedOrder.subtotal - parsedOrder.totalVat).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('quickOrder.vat')} (19%):</span>
                    <span>€{parsedOrder.totalVat.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>{t('common.total')}:</span>
                      <span className="text-green-600">€{parsedOrder.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Create Order Button */}
              <div className="text-center">
                <button
                  onClick={createOrderAndInvoice}
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
                      {t('quickOrder.createOrder')} (€{calculateTotal().toFixed(2)})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Invoice Section */}
          {invoiceData && (
            <div className="bg-yellow-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quickOrder.step4')}</h3>
              
              <div className="bg-white rounded-lg border border-yellow-200 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-medium text-gray-900">{t('quickOrder.invoiceDetails')}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>{t('quickOrder.invoiceNumber')}:</strong> {invoiceData.invoiceNumber}</p>
                    <p><strong>{t('common.date')}:</strong> {invoiceData.date}</p>
                    <p><strong>{t('common.customer')}:</strong> {invoiceData.customerName}</p>
                    {invoiceData.tableNumber && (
                      <p><strong>{t('common.table')}:</strong> {invoiceData.tableNumber}</p>
                    )}
                  </div>
                  <div>
                    <p><strong>{t('common.items')}:</strong> {invoiceData.items.length}</p>
                    <p><strong>{t('quickOrder.net')}:</strong> €{(invoiceData.subtotal - invoiceData.totalVat).toFixed(2)}</p>
                    <p><strong>{t('quickOrder.vat')}:</strong> €{invoiceData.totalVat.toFixed(2)}</p>
                    <p><strong>{t('common.total')}:</strong> €{invoiceData.grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={handleGenerateInvoice}
                  disabled={isGeneratingInvoice}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isGeneratingInvoice ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                  {t('quickOrder.pdfInvoice')}
                </button>

                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                  {t('quickOrder.sendEmail')}
                </button>

                <button
                  onClick={handleDATEVExport}
                  disabled={isExportingDATEV}
                  className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isExportingDATEV ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  {t('quickOrder.datevExport')}
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{t('quickOrder.automaticSending')}:</strong> {t('quickOrder.invoiceWillBeSent')} {accountantEmail} (CC: {ccEmail})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {t('quickOrder.workflow')}
            </div>
            <button
              onClick={() => {
                if (invoiceData) {
                  onOrderPlaced();
                }
                onClose();
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>

      {/* Company Settings Modal */}
      <CompanySettingsModal
        isOpen={showCompanySettings}
        onClose={() => setShowCompanySettings(false)}
        onSave={handleCompanyDataSave}
      />
    </div>
  );
}