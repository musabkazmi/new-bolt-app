import React, { useState, useEffect } from 'react';
import { X, Building, Save, Phone, Mail, Globe, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

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

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyData: CompanyData) => void;
}

export default function CompanySettingsModal({ isOpen, onClose, onSave }: CompanySettingsModalProps) {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      loadCompanyData();
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const loadCompanyData = () => {
    // Load from localStorage
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

  const handleInputChange = (field: keyof CompanyData, value: string) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!companyData.name.trim()) {
      setError('Firmenname ist erforderlich');
      setLoading(false);
      return;
    }

    if (!companyData.email.trim() || !companyData.email.includes('@')) {
      setError('Gültige E-Mail-Adresse ist erforderlich');
      setLoading(false);
      return;
    }

    try {
      // Save to localStorage
      localStorage.setItem('company-settings', JSON.stringify(companyData));
      
      // Call parent callback
      onSave(companyData);
      
      setSuccess('Firmeninformationen erfolgreich gespeichert!');
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Error saving company data:', error);
      setError('Fehler beim Speichern der Firmeninformationen');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Firmeninformationen</h2>
                <p className="opacity-90">Verwalten Sie Ihre Unternehmensdaten</p>
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
                <p className="text-red-700">{error}</p>
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

          {/* Company Basic Info */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grundinformationen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmenname *
                </label>
                <input
                  type="text"
                  value={companyData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ihr Firmenname"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Straße und Hausnummer
                </label>
                <input
                  type="text"
                  value={companyData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Musterstraße 123"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PLZ und Ort
                </label>
                <input
                  type="text"
                  value={companyData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345 Musterstadt"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontaktinformationen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Telefon
                </label>
                <input
                  type="tel"
                  value={companyData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+49 123 456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  E-Mail *
                </label>
                <input
                  type="email"
                  value={companyData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="info@ihrefirma.de"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  value={companyData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="www.ihrefirma.de"
                />
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <FileText className="w-5 h-5 inline mr-2" />
              Steuerliche Angaben
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Steuernummer
                </label>
                <input
                  type="text"
                  value={companyData.taxNumber}
                  onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DE123456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  USt-IdNr.
                </label>
                <input
                  type="text"
                  value={companyData.vatId}
                  onChange={(e) => handleInputChange('vatId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DE987654321"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vorschau</h3>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm">
                <p className="font-bold text-lg">{companyData.name}</p>
                <p>{companyData.address}</p>
                <p>{companyData.city}</p>
                <p className="mt-2">Tel: {companyData.phone}</p>
                <p>E-Mail: {companyData.email}</p>
                <p>Web: {companyData.website}</p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Steuernummer: {companyData.taxNumber}<br/>
                    USt-IdNr.: {companyData.vatId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}