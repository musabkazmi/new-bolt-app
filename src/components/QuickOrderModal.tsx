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
      setError('Spracherkennung wird in diesem Browser nicht unterstützt. Bitte verwenden Sie Chrome, Edge oder Safari.');
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
        throw new Error(`Fehler beim Laden der Speisekarte: ${error.message}`);
      }
      
      console.log('Menu items loaded:', data?.length || 0);
      setMenuItems(data || []);
      
      if (!data || data.length === 0) {
        setError('Keine Menüpunkte verfügbar. Bitte fügen Sie zuerst Menüpunkte hinzu.');
      }
    } catch (error: any) {
      console.error('Error loading menu items:', error);
      setError(error.message || 'Fehler beim Laden der Speisekarte');
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
        let errorMessage = 'Spracherkennungsfehler';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Mikrofonzugriff verweigert. Bitte erlauben Sie den Mikrofonzugriff und versuchen Sie es erneut.';
            break;
          case 'no-speech':
            errorMessage = 'Keine Sprache erkannt. Bitte sprechen Sie deutlich und versuchen Sie es erneut.';
            break;
          case 'audio-capture':
            errorMessage = 'Kein Mikrofon gefunden. Bitte überprüfen Sie Ihre Mikrofonverbindung.';
            break;
          case 'network':
            errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
            break;
          default:
            errorMessage = `Spracherkennungsfehler: ${event.error}`;
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
      setError('Spracherkennung konnte nicht initialisiert werden');
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
      setError('Mikrofonzugriff ist für Sprachbestellungen erforderlich. Bitte erlauben Sie den Mikrofonzugriff in Ihren Browser-Einstellungen.');
      return false;
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');
      
      if (!speechSupported) {
        setError('Spracherkennung wird in diesem Browser nicht unterstützt');
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
      setError(error.message || 'Aufnahme konnte nicht gestartet werden. Bitte überprüfen Sie die Mikrofonberechtigungen.');
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
          setError('Audio konnte nicht abgespielt werden');
        };
        
        audio.play();
      } catch (error) {
        console.error('Error playing audio:', error);
        setError('Audio konnte nicht abgespielt werden');
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
      setError('Keine Sprache erkannt. Bitte versuchen Sie es erneut.');
      return;
    }

    if (menuItems.length === 0) {
      setError('Keine Menüpunkte verfügbar. Bitte stellen Sie sicher, dass Menüpunkte geladen sind.');
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
          throw new Error('Ungültiges Bestellformat: Artikel-Array fehlt');
        }
        
        if (parsed.items.length === 0) {
          throw new Error('Keine Artikel in der Bestellung gefunden');
        }
        
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', response.answer);
        console.error('Parse error:', parseError);
        throw new Error('KI konnte die Bestellung nicht verstehen. Bitte versuchen Sie deutlicher zu sprechen oder verwenden Sie einfachere Sprache.');
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
        throw new Error('Keine Menüpunkte konnten aus Ihrer Bestellung zugeordnet werden. Bitte versuchen Sie es mit klareren Artikelnamen erneut.');
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

      setSuccess(`Bestellung erfolgreich analysiert! ${validItems.length} Artikel gefunden. Überprüfen und bestätigen Sie unten.`);

    } catch (error: any) {
      console.error('Error processing voice order:', error);
      setError(error.message || 'Sprachbestellung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateGuestName = () => {
    const guestNumber = Math.floor(Math.random() * 9999) + 1;
    return `Gast ${guestNumber}`;
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
      setError('Keine Bestellung zu erstellen oder Benutzer nicht authentifiziert');
      return;
    }

    const validItems = parsedOrder.items.filter(item => item.menuItem);
    if (validItems.length === 0) {
      setError('Keine gültigen Menüpunkte in der Bestellung gefunden');
      return;
    }

    try {
      setIsCreatingOrder(true);
      setError('');

      console.log('Creating quick voice order with items:', validItems);

      const tableNum = tableNumber ? parseInt(tableNumber) : null;
      if (tableNumber && (isNaN(tableNum) || tableNum <= 0)) {
        setError('Bitte geben Sie eine gültige Tischnummer ein oder lassen Sie das Feld leer');
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
        throw new Error(`Bestellung konnte nicht erstellt werden: ${orderError.message}`);
      }

      console.log('Order created successfully:', createdOrder);

      // Create order items with special instructions in notes
      const orderItemsData = validItems.map(item => ({
        order_id: createdOrder.id,
        menu_item_id: item.menuItem!.id,
        quantity: item.quantity,
        price: item.unitPrice,
        notes: item.notes || parsedOrder.specialInstructions || `Sprachbestellung: "${transcript.slice(0, 100)}${transcript.length > 100 ? '...' : ''}"`,
        status: 'pending' as const
      }));

      console.log('Inserting order items:', orderItemsData);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        throw new Error(`Artikel konnten nicht zur Bestellung hinzugefügt werden: ${itemsError.message}`);
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
      setSuccess(`Sprachbestellung erfolgreich erstellt! Bestellung #${createdOrder.id.slice(0, 8)} - Gesamt: €${parsedOrder.grandTotal.toFixed(2)}`);

    } catch (error: any) {
      console.error('Error creating order:', error);
      setError(error.message || 'Bestellung konnte nicht erstellt werden');
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

      setSuccess('Rechnung erfolgreich generiert und heruntergeladen!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      setError('Fehler beim Generieren der Rechnung');
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
      setSuccess('Rechnung erfolgreich per E-Mail an Steuerberater gesendet!');
    } catch (error) {
      console.error('Error sending email:', error);
      setError('Fehler beim Versenden der E-Mail');
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

      setSuccess('DATEV-Export erfolgreich generiert und heruntergeladen!');
    } catch (error) {
      console.error('Error generating DATEV export:', error);
      setError('Fehler beim Generieren des DATEV-Exports');
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
                <h2 className="text-2xl font-bold">Quick-Modus Sprachbestellung</h2>
                <p className="opacity-90">Sprechen Sie Ihre Bestellung - automatische Rechnungsgenerierung</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompanySettings(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Firmeninformationen bearbeiten"
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
                  {error.includes('Mikrofonzugriff') && (
                    <button
                      onClick={requestMicrophonePermission}
                      className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Mikrofonzugriff gewähren
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
                <span className="text-blue-800 font-medium">Firmeninformationen</span>
              </div>
              <button
                onClick={() => setShowCompanySettings(true)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <Settings className="w-3 h-3" />
                Bearbeiten
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
                  Speisekarten-Status: {menuItems.length} Artikel geladen
                </span>
              </div>
              <button
                onClick={loadMenuItems}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <RefreshCw className="w-3 h-3" />
                Aktualisieren
              </button>
            </div>
          </div>

          {/* Voice Recording Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schritt 1: Bestellung aufnehmen</h3>
            
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
                    Aufnahme starten
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <MicOff className="w-5 h-5" />
                    Aufnahme stoppen
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
                        Abspielen
                      </button>
                    ) : (
                      <button
                        onClick={pauseAudio}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Pause className="w-5 h-5" />
                        Pause
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Zurücksetzen
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {isRecording 
                  ? 'Hört zu... Sprechen Sie Ihre Bestellung deutlich' 
                  : speechSupported
                    ? 'Klicken Sie "Aufnahme starten" und sprechen Sie Ihre Bestellung natürlich'
                    : 'Spracherkennung in diesem Browser nicht verfügbar'
                }
              </p>

              <div className="text-xs text-gray-500 bg-white p-3 rounded-lg">
                <p className="font-medium mb-1">Beispielbestellungen:</p>
                <p>"Zwei Bier, eine Currywurst mit Pommes, eine Fanta"</p>
                <p>"Tisch 5 möchte zwei Margherita-Pizzen und einen Caesar-Salat"</p>
                <p>"Ein gegrillter Lachs ohne Sauce und zwei Hausweine für Tisch 3"</p>
              </div>
            </div>
          </div>

          {/* Transcript Section */}
          {transcript && (
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Schritt 2: Transkript überprüfen</h3>
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
                      Wird mit KI verarbeitet...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Bestellung mit KI verarbeiten
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Parsed Order Section */}
          {parsedOrder && (
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Schritt 3: Bestelldetails bestätigen</h3>
              
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Kundenname (optional - generiert automatisch Gastnamen)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Kundennamen eingeben (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Tischnummer (optional)
                  </label>
                  <input
                    type="number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Tischnummer eingeben (optional)"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg border border-green-200 p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Bestellartikel:</h4>
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
                                Nicht auf Speisekarte
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-sm text-gray-600 italic">Notiz: {item.notes}</p>
                          )}
                          {item.menuItem && (
                            <div className="text-sm text-gray-500 mt-1">
                              <p>€{item.unitPrice.toFixed(2)} je Stück</p>
                              <p>MwSt (19%): €{item.vatAmount.toFixed(2)}</p>
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
                  <h4 className="font-medium text-gray-900 mb-2">Besondere Anweisungen:</h4>
                  <p className="text-gray-700">{parsedOrder.specialInstructions}</p>
                </div>
              )}

              {/* Total Calculation */}
              <div className="bg-white rounded-lg border border-green-200 p-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Zwischensumme:</span>
                    <span>€{(parsedOrder.subtotal - parsedOrder.totalVat).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>MwSt (19%):</span>
                    <span>€{parsedOrder.totalVat.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Gesamtbetrag:</span>
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
                      Bestellung wird erstellt...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Bestellung erstellen (€{calculateTotal().toFixed(2)})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Invoice Section */}
          {invoiceData && (
            <div className="bg-yellow-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Schritt 4: Rechnung generieren und versenden</h3>
              
              <div className="bg-white rounded-lg border border-yellow-200 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-medium text-gray-900">Rechnungsdetails</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Rechnungsnummer:</strong> {invoiceData.invoiceNumber}</p>
                    <p><strong>Datum:</strong> {invoiceData.date}</p>
                    <p><strong>Kunde:</strong> {invoiceData.customerName}</p>
                    {invoiceData.tableNumber && (
                      <p><strong>Tisch:</strong> {invoiceData.tableNumber}</p>
                    )}
                  </div>
                  <div>
                    <p><strong>Artikel:</strong> {invoiceData.items.length}</p>
                    <p><strong>Netto:</strong> €{(invoiceData.subtotal - invoiceData.totalVat).toFixed(2)}</p>
                    <p><strong>MwSt:</strong> €{invoiceData.totalVat.toFixed(2)}</p>
                    <p><strong>Gesamt:</strong> €{invoiceData.grandTotal.toFixed(2)}</p>
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
                  PDF Rechnung
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
                  E-Mail senden
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
                  DATEV Export
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Automatischer Versand:</strong> Rechnung wird automatisch an {accountantEmail} gesendet (CC: {ccEmail})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Quick-Modus: Sprache → KI-Analyse → Bestellung → Rechnung → E-Mail
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
              Schließen
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