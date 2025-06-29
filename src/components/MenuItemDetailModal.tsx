import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Mic, MicOff, Upload, RefreshCw, Sparkles, 
  AlertTriangle, Utensils, DollarSign, Tag, Clock,
  Volume2, Play, Pause, Save, Edit3, Camera, Image, Minus
} from 'lucide-react';
import { MenuItem, supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface MenuItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItem | null;
  onAddToOrder: (menuItem: MenuItem, notes?: string) => void;
}

interface AllergenInfo {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

interface IngredientInfo {
  name: string;
  category: 'protein' | 'vegetable' | 'grain' | 'dairy' | 'spice' | 'sauce' | 'other';
  optional: boolean;
}

export default function MenuItemDetailModal({ isOpen, onClose, menuItem, onAddToOrder }: MenuItemDetailModalProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [ingredients, setIngredients] = useState<IngredientInfo[]>([]);
  const [allergens, setAllergens] = useState<AllergenInfo[]>([]);
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isSavingImage, setIsSavingImage] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen && menuItem) {
      initializeMenuItemData();
      checkSpeechSupport();
    }
    return () => {
      stopRecording();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen, menuItem]);

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
      recognition.lang = 'en-US';

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
          setNotes(prev => prev + finalTranscript);
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

  const initializeMenuItemData = () => {
    if (!menuItem) return;

    // Set existing image or placeholder
    setImageUrl(menuItem.image_url || '');

    // Mock ingredients based on menu item name and category
    const mockIngredients = generateMockIngredients(menuItem);
    setIngredients(mockIngredients);

    // Mock allergens based on ingredients
    const mockAllergens = generateMockAllergens(mockIngredients);
    setAllergens(mockAllergens);

    // Reset form
    setNotes('');
    setTranscript('');
    setQuantity(1);
    setAudioBlob(null);
  };

  const generateMockIngredients = (item: MenuItem): IngredientInfo[] => {
    const baseIngredients: IngredientInfo[] = [];
    const name = item.name.toLowerCase();
    const category = item.category.toLowerCase();

    // Add ingredients based on item name and category
    if (name.includes('pizza')) {
      baseIngredients.push(
        { name: 'Pizza Dough', category: 'grain', optional: false },
        { name: 'Tomato Sauce', category: 'sauce', optional: false },
        { name: 'Mozzarella Cheese', category: 'dairy', optional: false },
        { name: 'Fresh Basil', category: 'spice', optional: true },
        { name: 'Olive Oil', category: 'sauce', optional: false }
      );
    } else if (name.includes('salad')) {
      baseIngredients.push(
        { name: 'Mixed Greens', category: 'vegetable', optional: false },
        { name: 'Cherry Tomatoes', category: 'vegetable', optional: false },
        { name: 'Cucumber', category: 'vegetable', optional: true },
        { name: 'Red Onion', category: 'vegetable', optional: true },
        { name: 'Olive Oil Dressing', category: 'sauce', optional: false }
      );
    } else if (name.includes('salmon')) {
      baseIngredients.push(
        { name: 'Atlantic Salmon Fillet', category: 'protein', optional: false },
        { name: 'Lemon', category: 'other', optional: false },
        { name: 'Butter', category: 'dairy', optional: false },
        { name: 'Seasonal Vegetables', category: 'vegetable', optional: false },
        { name: 'Herbs', category: 'spice', optional: true }
      );
    } else if (name.includes('chicken')) {
      baseIngredients.push(
        { name: 'Chicken Breast', category: 'protein', optional: false },
        { name: 'Garlic', category: 'spice', optional: false },
        { name: 'Black Pepper', category: 'spice', optional: false },
        { name: 'Salt', category: 'spice', optional: false }
      );
    } else if (category.includes('dessert')) {
      baseIngredients.push(
        { name: 'Sugar', category: 'other', optional: false },
        { name: 'Flour', category: 'grain', optional: false },
        { name: 'Eggs', category: 'protein', optional: false },
        { name: 'Butter', category: 'dairy', optional: false }
      );
    } else {
      // Generic ingredients
      baseIngredients.push(
        { name: 'Fresh Ingredients', category: 'other', optional: false },
        { name: 'Seasonings', category: 'spice', optional: false },
        { name: 'Chef\'s Special Sauce', category: 'sauce', optional: true }
      );
    }

    return baseIngredients;
  };

  const generateMockAllergens = (ingredients: IngredientInfo[]): AllergenInfo[] => {
    const allergens: AllergenInfo[] = [];
    
    ingredients.forEach(ingredient => {
      const name = ingredient.name.toLowerCase();
      
      if (name.includes('cheese') || name.includes('dairy') || name.includes('butter') || name.includes('milk')) {
        allergens.push({
          name: 'Dairy',
          severity: 'moderate',
          description: 'Contains milk and dairy products'
        });
      }
      
      if (name.includes('flour') || name.includes('dough') || name.includes('bread')) {
        allergens.push({
          name: 'Gluten',
          severity: 'severe',
          description: 'Contains wheat and gluten'
        });
      }
      
      if (name.includes('egg')) {
        allergens.push({
          name: 'Eggs',
          severity: 'moderate',
          description: 'Contains eggs'
        });
      }
      
      if (name.includes('salmon') || name.includes('fish')) {
        allergens.push({
          name: 'Fish',
          severity: 'severe',
          description: 'Contains fish and seafood'
        });
      }
      
      if (name.includes('nuts') || name.includes('almond') || name.includes('peanut')) {
        allergens.push({
          name: 'Nuts',
          severity: 'severe',
          description: 'Contains tree nuts or peanuts'
        });
      }
    });

    // Remove duplicates
    return allergens.filter((allergen, index, self) => 
      index === self.findIndex(a => a.name === allergen.name)
    );
  };

  const generateNewImage = async () => {
    if (!menuItem) return;
    
    setIsGeneratingImage(true);
    
    try {
      console.log('Generating AI image for menu item:', menuItem.name);
      
      // Create a detailed prompt for the AI image generation
      const prompt = `A professional, appetizing photograph of ${menuItem.name}, ${menuItem.description}. 
      High-quality restaurant food photography, well-lit, beautifully plated, garnished, 
      shot from above on a clean white plate, professional food styling, 
      vibrant colors, appetizing presentation, commercial food photography style.`;

      console.log('AI Image prompt:', prompt);

      // Call OpenAI DALL-E API through our backend
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          size: '512x512',
          quality: 'standard'
        })
      });

      if (!response.ok) {
        // Fallback to Unsplash API for food images
        console.log('OpenAI API not available, using Unsplash fallback...');
        
        const foodKeywords = extractFoodKeywords(menuItem.name, menuItem.category);
        const unsplashUrl = `https://source.unsplash.com/512x512/?${foodKeywords.join(',')}&food,restaurant,meal`;
        
        // Add cache busting to get different images
        const cacheBuster = Date.now();
        setImageUrl(`${unsplashUrl}&t=${cacheBuster}`);
        
        console.log('Using Unsplash image:', unsplashUrl);
      } else {
        const data = await response.json();
        
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          console.log('AI image generated successfully');
        } else {
          throw new Error('No image URL returned from AI service');
        }
      }
      
    } catch (error) {
      console.error('Error generating AI image:', error);
      
      // Fallback to Unsplash with food-related keywords
      const foodKeywords = extractFoodKeywords(menuItem.name, menuItem.category);
      const unsplashUrl = `https://source.unsplash.com/512x512/?${foodKeywords.join(',')}&food,restaurant,delicious`;
      
      // Add cache busting and random seed for variety
      const cacheBuster = Date.now();
      const randomSeed = Math.floor(Math.random() * 1000);
      setImageUrl(`${unsplashUrl}&t=${cacheBuster}&sig=${randomSeed}`);
      
      console.log('Fallback to Unsplash image with keywords:', foodKeywords);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const extractFoodKeywords = (name: string, category: string): string[] => {
    const keywords: string[] = [];
    const nameLower = name.toLowerCase();
    const categoryLower = category.toLowerCase();
    
    // Add category-based keywords
    if (categoryLower.includes('pizza')) keywords.push('pizza', 'italian');
    if (categoryLower.includes('salad')) keywords.push('salad', 'fresh', 'vegetables');
    if (categoryLower.includes('dessert')) keywords.push('dessert', 'sweet', 'cake');
    if (categoryLower.includes('main')) keywords.push('main-course', 'dinner');
    if (categoryLower.includes('appetizer')) keywords.push('appetizer', 'starter');
    if (categoryLower.includes('beverage') || categoryLower.includes('drink')) keywords.push('drink', 'beverage');
    
    // Add name-based keywords
    if (nameLower.includes('salmon')) keywords.push('salmon', 'fish', 'seafood');
    if (nameLower.includes('chicken')) keywords.push('chicken', 'poultry');
    if (nameLower.includes('beef')) keywords.push('beef', 'meat');
    if (nameLower.includes('pasta')) keywords.push('pasta', 'italian');
    if (nameLower.includes('burger')) keywords.push('burger', 'sandwich');
    if (nameLower.includes('soup')) keywords.push('soup', 'bowl');
    if (nameLower.includes('steak')) keywords.push('steak', 'grilled');
    if (nameLower.includes('chocolate')) keywords.push('chocolate', 'dessert');
    if (nameLower.includes('cheese')) keywords.push('cheese', 'dairy');
    if (nameLower.includes('wine')) keywords.push('wine', 'glass');
    if (nameLower.includes('coffee')) keywords.push('coffee', 'espresso');
    
    // Ensure we have at least some keywords
    if (keywords.length === 0) {
      keywords.push('food', 'restaurant', 'gourmet');
    }
    
    // Limit to 5 keywords for better results
    return keywords.slice(0, 5);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !menuItem) return;

    try {
      setIsSavingImage(true);
      console.log('Uploading image for menu item:', menuItem.id);

      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        try {
          // Update the menu item with the new image
          const { error } = await supabase
            .from('menu_items')
            .update({ image_url: base64Data })
            .eq('id', menuItem.id);

          if (error) {
            console.error('Error saving image to database:', error);
            throw error;
          }

          // Update local state
          setImageUrl(base64Data);
          console.log('Image saved successfully to database');
          
        } catch (error) {
          console.error('Error saving image:', error);
          // Still show the image locally even if database save fails
          setImageUrl(base64Data);
        } finally {
          setIsSavingImage(false);
        }
      };

      reader.onerror = () => {
        console.error('Error reading file');
        setIsSavingImage(false);
      };

      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error handling image upload:', error);
      setIsSavingImage(false);
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

  const handleAddToOrder = () => {
    if (menuItem) {
      for (let i = 0; i < quantity; i++) {
        onAddToOrder(menuItem, notes.trim() || undefined);
      }
      onClose();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'mild': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'protein': return 'bg-red-50 text-red-700';
      case 'vegetable': return 'bg-green-50 text-green-700';
      case 'grain': return 'bg-yellow-50 text-yellow-700';
      case 'dairy': return 'bg-blue-50 text-blue-700';
      case 'spice': return 'bg-purple-50 text-purple-700';
      case 'sauce': return 'bg-orange-50 text-orange-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  if (!isOpen || !menuItem) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{menuItem.name}</h2>
                <p className="opacity-90">{t('menu.itemDetails')}</p>
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

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Image and Basic Info */}
            <div className="space-y-6">
              {/* Image Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t('menu.itemImage')}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSavingImage}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                    >
                      {isSavingImage ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {t('menu.upload')}
                    </button>
                    <button
                      onClick={generateNewImage}
                      disabled={isGeneratingImage}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50"
                    >
                      {isGeneratingImage ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {t('menu.aiGenerate')}
                    </button>
                  </div>
                </div>
                
                <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={menuItem.name}
                      className="w-full h-full object-cover"
                      onError={() => {
                        console.log('Image failed to load, trying fallback...');
                        // Fallback to a generic food image
                        const fallbackUrl = `https://source.unsplash.com/512x512/?food,restaurant,delicious&t=${Date.now()}`;
                        setImageUrl(fallbackUrl);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t('menu.noImageAvailable')}</p>
                      </div>
                    </div>
                  )}
                  
                  {(isGeneratingImage || isSavingImage) && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p>{isGeneratingImage ? t('menu.generatingAiImage') : 'Saving image...'}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Basic Info */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('menu.itemDetails')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('common.price')}:</span>
                    <span className="text-2xl font-bold text-green-600">${menuItem.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('common.category')}:</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {t(`category.${menuItem.category}`) || menuItem.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('common.status')}:</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      menuItem.available 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {menuItem.available ? t('common.available') : t('common.unavailable')}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <span className="text-gray-600 block mb-2">{t('common.description')}:</span>
                  <p className="text-gray-800">{menuItem.description}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Ingredients, Allergens, Notes */}
            <div className="space-y-6">
              {/* Ingredients */}
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('menu.ingredients')}</h3>
                <div className="space-y-2">
                  {ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                      <span className="font-medium">{ingredient.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(ingredient.category)}`}>
                          {ingredient.category}
                        </span>
                        {ingredient.optional && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {t('common.optional')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allergens */}
              <div className="bg-red-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('menu.allergenInformation')}</h3>
                {allergens.length > 0 ? (
                  <div className="space-y-3">
                    {allergens.map((allergen, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(allergen.severity)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{allergen.name}</span>
                          <span className="text-xs uppercase font-bold">{allergen.severity}</span>
                        </div>
                        <p className="text-sm">{allergen.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">{t('menu.noKnownAllergens')}</p>
                )}
              </div>

              {/* Notes Section with Voice Dictation */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('orders.specialInstructions')}</h3>
                
                {/* Voice Recording Controls */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">{t('voice.title')}</span>
                    {!speechSupported && (
                      <span className="text-xs text-orange-600">({t('voice.speechNotSupported')})</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={!speechSupported}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                      >
                        <Mic className="w-4 h-4" />
                        {t('voice.startRecording')}
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        <MicOff className="w-4 h-4" />
                        {t('voice.stopRecording')}
                      </button>
                    )}
                    
                    {audioBlob && (
                      <>
                        {!isPlaying ? (
                          <button
                            onClick={playAudio}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            <Play className="w-4 h-4" />
                            {t('voice.play')}
                          </button>
                        ) : (
                          <button
                            onClick={pauseAudio}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            <Pause className="w-4 h-4" />
                            {t('voice.pause')}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {isRecording && (
                    <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      {t('voice.listening')}
                    </div>
                  )}
                </div>

                {/* Notes Textarea */}
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('orders.specialInstructions')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                
                {transcript && (
                  <div className="mt-2 p-2 bg-white rounded border text-sm">
                    <span className="text-gray-600">{t('voice.voiceTranscript')}: </span>
                    <span className="italic">"{transcript}"</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{t('common.quantity')}:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="text-lg font-bold text-gray-900">
                {t('common.total')}: ${(menuItem.price * quantity).toFixed(2)}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddToOrder}
                disabled={!menuItem.available}
                className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                  menuItem.available
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-5 h-5" />
                {t('menu.addToCart')} ({quantity})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}