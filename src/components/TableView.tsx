import React, { useState, useEffect } from 'react';
import { 
  Plus, Users, Clock, DollarSign, Edit, Eye, Save, X,
  Square, Circle, Minus, RotateCcw, MapPin, Settings,
  ShoppingCart, User, Utensils, AlertCircle, Check
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase, Order } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import NewOrderModal from './NewOrderModal';

interface Table {
  id: string;
  number: number;
  seats: number;
  shape: 'round' | 'square' | 'rectangular' | 'oval';
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  currentOrders?: Order[];
  x?: number;
  y?: number;
}

interface SeatOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  seatNumber: number | null;
  onOrderPlaced: () => void;
}

interface TableEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  onTableUpdated: (updatedTable: Table) => void;
}

function SeatOrderModal({ isOpen, onClose, table, seatNumber, onOrderPlaced }: SeatOrderModalProps) {
  if (!isOpen || !table || !seatNumber) return null;

  return (
    <NewOrderModal
      isOpen={isOpen}
      onClose={onClose}
      onOrderPlaced={() => {
        onOrderPlaced();
        onClose();
      }}
      prefilledTableNumber={table.number}
      prefilledSeatNumber={seatNumber}
    />
  );
}

function TableEditModal({ isOpen, onClose, table, onTableUpdated }: TableEditModalProps) {
  const [editData, setEditData] = useState({
    number: 1,
    seats: 4,
    shape: 'square' as Table['shape'],
    status: 'available' as Table['status']
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    if (table) {
      setEditData({
        number: table.number,
        seats: table.seats,
        shape: table.shape,
        status: table.status
      });
    }
  }, [table]);

  const handleSave = () => {
    if (editData.seats < 1 || editData.seats > 20) {
      setError(t('error.seatsRange'));
      return;
    }

    if (editData.number < 1) {
      setError(t('error.tableNumberInvalid'));
      return;
    }

    setSaving(true);
    setError('');

    // Simulate save (in real app, this would update the database)
    setTimeout(() => {
      const updatedTable: Table = {
        ...table!,
        number: editData.number,
        seats: editData.seats,
        shape: editData.shape,
        status: editData.status
      };
      
      onTableUpdated(updatedTable);
      setSaving(false);
      onClose();
    }, 500);
  };

  const getShapeIcon = (shape: string, isSelected: boolean = false) => {
    const baseClasses = `w-8 h-8 cursor-pointer transition-all ${
      isSelected 
        ? 'text-blue-600 bg-blue-100 border-2 border-blue-300' 
        : 'text-gray-400 hover:text-gray-600 border-2 border-gray-200 hover:border-gray-300'
    } p-2 rounded-lg`;

    switch (shape) {
      case 'round':
        return <Circle className={baseClasses} onClick={() => setEditData(prev => ({ ...prev, shape: 'round' }))} />;
      case 'square':
        return <Square className={baseClasses} onClick={() => setEditData(prev => ({ ...prev, shape: 'square' }))} />;
      case 'rectangular':
        return <Minus className={`${baseClasses} rotate-0`} onClick={() => setEditData(prev => ({ ...prev, shape: 'rectangular' }))} />;
      case 'oval':
        return <RotateCcw className={baseClasses} onClick={() => setEditData(prev => ({ ...prev, shape: 'oval' }))} />;
      default:
        return <Square className={baseClasses} />;
    }
  };

  if (!isOpen || !table) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('tables.editTable')} {table.number}</h2>
                <p className="opacity-90">{t('tables.customizeProperties')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Table Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tables.tableNumber')}
            </label>
            <input
              type="number"
              value={editData.number}
              onChange={(e) => setEditData(prev => ({ ...prev, number: parseInt(e.target.value) || 1 }))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Number of Seats */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tables.numberOfSeats')}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditData(prev => ({ ...prev, seats: Math.max(1, prev.seats - 1) }))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={editData.seats}
                onChange={(e) => setEditData(prev => ({ ...prev, seats: parseInt(e.target.value) || 1 }))}
                min="1"
                max="20"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              />
              <button
                onClick={() => setEditData(prev => ({ ...prev, seats: Math.min(20, prev.seats + 1) }))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('tables.maxSeats')}</p>
          </div>

          {/* Table Shape */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('tables.tableShape')}
            </label>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                {getShapeIcon('round', editData.shape === 'round')}
                <p className="text-xs text-gray-600 mt-1">{t('tables.round')}</p>
              </div>
              <div className="text-center">
                {getShapeIcon('square', editData.shape === 'square')}
                <p className="text-xs text-gray-600 mt-1">{t('tables.square')}</p>
              </div>
              <div className="text-center">
                {getShapeIcon('rectangular', editData.shape === 'rectangular')}
                <p className="text-xs text-gray-600 mt-1">{t('tables.rectangle')}</p>
              </div>
              <div className="text-center">
                {getShapeIcon('oval', editData.shape === 'oval')}
                <p className="text-xs text-gray-600 mt-1">{t('tables.oval')}</p>
              </div>
            </div>
          </div>

          {/* Table Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tables.tableStatus')}
            </label>
            <select
              value={editData.status}
              onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as Table['status'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="available">{t('tables.available')}</option>
              <option value="occupied">{t('tables.occupied')}</option>
              <option value="reserved">{t('tables.reserved')}</option>
              <option value="cleaning">{t('tables.cleaning')}</option>
            </select>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">{t('tables.preview')}</h4>
            <div className="flex justify-center">
              <div className={`relative w-24 h-24 border-2 rounded-lg flex items-center justify-center ${
                editData.status === 'available' ? 'bg-green-100 border-green-300 text-green-800' :
                editData.status === 'occupied' ? 'bg-red-100 border-red-300 text-red-800' :
                editData.status === 'reserved' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                'bg-gray-100 border-gray-300 text-gray-800'
              }`}>
                <div className="text-center">
                  {editData.shape === 'round' && <Circle className="w-6 h-6 mx-auto mb-1" />}
                  {editData.shape === 'square' && <Square className="w-6 h-6 mx-auto mb-1" />}
                  {editData.shape === 'rectangular' && <Minus className="w-6 h-6 mx-auto mb-1" />}
                  {editData.shape === 'oval' && <RotateCcw className="w-6 h-6 mx-auto mb-1" />}
                  <div className="font-bold text-sm">T{editData.number}</div>
                  <div className="text-xs">{editData.seats} {t('tables.seats')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('tables.saveChanges')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TableView() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showSeatOrderModal, setShowSeatOrderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      loadTables();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Check if a specific table is requested via URL params
    const tableParam = searchParams.get('table');
    if (tableParam && tables.length > 0) {
      const tableNumber = parseInt(tableParam);
      const table = tables.find(t => t.number === tableNumber);
      if (table) {
        setSelectedTable(table);
        // Scroll to the table or highlight it
        setTimeout(() => {
          const tableElement = document.querySelector(`[data-table="${tableNumber}"]`);
          if (tableElement) {
            tableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a temporary highlight effect
            tableElement.classList.add('ring-4', 'ring-blue-400', 'ring-opacity-75');
            setTimeout(() => {
              tableElement.classList.remove('ring-4', 'ring-blue-400', 'ring-opacity-75');
            }, 3000);
          }
        }, 100);
      }
    }
  }, [searchParams, tables]);

  const loadTables = async () => {
    try {
      setLoading(true);
      setError('');

      // Generate mock tables with different shapes and configurations
      const mockTables: Table[] = [
        { id: '1', number: 1, seats: 2, shape: 'round', status: 'available', x: 100, y: 100 },
        { id: '2', number: 2, seats: 4, shape: 'square', status: 'occupied', x: 300, y: 100 },
        { id: '3', number: 3, seats: 6, shape: 'rectangular', status: 'available', x: 500, y: 100 },
        { id: '4', number: 4, seats: 4, shape: 'oval', status: 'reserved', x: 100, y: 300 },
        { id: '5', number: 5, seats: 8, shape: 'rectangular', status: 'occupied', x: 300, y: 300 },
        { id: '6', number: 6, seats: 2, shape: 'round', status: 'cleaning', x: 500, y: 300 },
        { id: '7', number: 7, seats: 6, shape: 'oval', status: 'available', x: 100, y: 500 },
        { id: '8', number: 8, seats: 4, shape: 'square', status: 'available', x: 300, y: 500 },
      ];

      // Load current orders for each table
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'preparing', 'ready', 'served'])
        .not('table_number', 'is', null);

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
      }

      // Group orders by table number
      const ordersByTable = (orders || []).reduce((acc, order) => {
        const tableNum = order.table_number;
        if (tableNum) {
          if (!acc[tableNum]) acc[tableNum] = [];
          acc[tableNum].push(order);
        }
        return acc;
      }, {} as Record<number, Order[]>);

      // Update table statuses based on orders
      const tablesWithOrders = mockTables.map(table => {
        const tableOrders = ordersByTable[table.number] || [];
        return {
          ...table,
          currentOrders: tableOrders,
          status: tableOrders.length > 0 ? 'occupied' as const : table.status
        };
      });

      setTables(tablesWithOrders);
    } catch (error) {
      console.error('Error loading tables:', error);
      setError(t('error.loadingFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getTableIcon = (shape: string, size: 'small' | 'medium' | 'large' = 'medium') => {
    const sizeClasses = {
      small: 'w-4 h-4',
      medium: 'w-6 h-6',
      large: 'w-8 h-8'
    };

    switch (shape) {
      case 'round':
        return <Circle className={sizeClasses[size]} />;
      case 'square':
        return <Square className={sizeClasses[size]} />;
      case 'rectangular':
        return <Minus className={`${sizeClasses[size]} rotate-0`} />;
      case 'oval':
        return <RotateCcw className={sizeClasses[size]} />;
      default:
        return <Square className={sizeClasses[size]} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200';
      case 'occupied':
        return 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200';
      case 'reserved':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200';
      case 'cleaning':
        return 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200';
    }
  };

  const handleTableClick = (table: Table) => {
    if (editMode) {
      setSelectedTable(table);
      setShowEditModal(true);
      return;
    }

    setSelectedTable(table);
    if (table.status === 'available' || table.status === 'occupied') {
      setShowNewOrderModal(true);
    }
  };

  const handleSeatClick = (table: Table, seatNumber: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent table click
    if (editMode) return; // Don't allow seat clicks in edit mode
    
    setSelectedTable(table);
    setSelectedSeat(seatNumber);
    setShowSeatOrderModal(true);
  };

  const handleTableUpdated = (updatedTable: Table) => {
    setTables(prev => prev.map(table => 
      table.id === updatedTable.id ? updatedTable : table
    ));
  };

  const renderTableSeats = (table: Table) => {
    if (editMode) return null; // Don't show seats in edit mode
    
    const seats = [];
    const seatPositions = getSeatPositions(table.shape, table.seats);
    
    for (let i = 1; i <= table.seats; i++) {
      const position = seatPositions[i - 1] || { x: 0, y: 0 };
      seats.push(
        <button
          key={i}
          onClick={(e) => handleSeatClick(table, i, e)}
          className="absolute w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold hover:bg-blue-600 transition-colors flex items-center justify-center shadow-md"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
          title={`${t('tables.seatNumber')} ${i} - ${t('common.clickToOrder')}`}
        >
          {i}
        </button>
      );
    }
    
    return seats;
  };

  const getSeatPositions = (shape: string, seatCount: number) => {
    const positions: { x: number; y: number }[] = [];
    
    switch (shape) {
      case 'round':
      case 'oval':
        // Arrange seats in a circle/oval
        for (let i = 0; i < seatCount; i++) {
          const angle = (i * 2 * Math.PI) / seatCount - Math.PI / 2; // Start from top
          const radiusX = shape === 'oval' ? 45 : 40;
          const radiusY = shape === 'oval' ? 35 : 40;
          positions.push({
            x: 50 + radiusX * Math.cos(angle),
            y: 50 + radiusY * Math.sin(angle)
          });
        }
        break;
        
      case 'square':
        // Arrange seats around the perimeter of a square
        const perSide = Math.ceil(seatCount / 4);
        for (let i = 0; i < seatCount; i++) {
          const side = Math.floor(i / perSide);
          const positionOnSide = i % perSide;
          const ratio = perSide > 1 ? positionOnSide / (perSide - 1) : 0.5;
          
          switch (side) {
            case 0: // Top
              positions.push({ x: 20 + ratio * 60, y: 10 });
              break;
            case 1: // Right
              positions.push({ x: 90, y: 20 + ratio * 60 });
              break;
            case 2: // Bottom
              positions.push({ x: 80 - ratio * 60, y: 90 });
              break;
            case 3: // Left
              positions.push({ x: 10, y: 80 - ratio * 60 });
              break;
          }
        }
        break;
        
      case 'rectangular':
        // Arrange seats along the long sides
        const seatsPerLongSide = Math.ceil(seatCount / 2);
        for (let i = 0; i < seatCount; i++) {
          if (i < seatsPerLongSide) {
            // Top side
            positions.push({
              x: 15 + (i * 70) / (seatsPerLongSide - 1 || 1),
              y: 10
            });
          } else {
            // Bottom side
            const bottomIndex = i - seatsPerLongSide;
            positions.push({
              x: 85 - (bottomIndex * 70) / (seatCount - seatsPerLongSide - 1 || 1),
              y: 90
            });
          }
        }
        break;
        
      default:
        // Default arrangement in a circle
        for (let i = 0; i < seatCount; i++) {
          const angle = (i * 2 * Math.PI) / seatCount;
          positions.push({
            x: 50 + 40 * Math.cos(angle),
            y: 50 + 40 * Math.sin(angle)
          });
        }
    }
    
    return positions;
  };

  const handleOrderPlaced = () => {
    loadTables(); // Refresh table data
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">{t('error.loadingFailed')}</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={loadTables}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {t('error.tryAgain')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('tables.title')}</h1>
          <p className="text-gray-600">
            {editMode 
              ? t('tables.editModeDescription')
              : t('tables.interactiveDescription')
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              editMode 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {editMode ? (
              <>
                <Check className="w-4 h-4" />
                {t('tables.doneEditing')}
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                {t('tables.editTables')}
              </>
            )}
          </button>
          <button
            onClick={loadTables}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('common.legend')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 border-2 border-green-300 rounded-lg flex items-center justify-center">
              <Square className="w-4 h-4 text-green-800" />
            </div>
            <span className="text-sm text-gray-700">{t('tables.available')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 border-2 border-red-300 rounded-lg flex items-center justify-center">
              <Circle className="w-4 h-4 text-red-800" />
            </div>
            <span className="text-sm text-gray-700">{t('tables.occupied')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 border-2 border-yellow-300 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-yellow-800" />
            </div>
            <span className="text-sm text-gray-700">{t('tables.reserved')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center justify-center">
              1
            </div>
            <span className="text-sm text-gray-700">{t('tables.seatNumber')}</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{t('common.howToUse')}:</strong> 
            {editMode 
              ? ` ${t('tables.editModeInstructions')}`
              : ` ${t('tables.orderInstructions')}`
            }
          </p>
        </div>
      </div>

      {/* Table Layout */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('tables.floorPlan')}</h3>
        </div>
        <div className="relative bg-gray-50 min-h-[600px] p-8">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 grid-rows-8 h-full w-full">
              {Array.from({ length: 96 }).map((_, i) => (
                <div key={i} className="border border-gray-300"></div>
              ))}
            </div>
          </div>

          {/* Tables */}
          {tables.map((table) => (
            <div
              key={table.id}
              data-table={table.number}
              className={`absolute cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                editMode ? 'cursor-pointer ring-2 ring-blue-300' : 'cursor-pointer'
              }`}
              style={{
                left: `${table.x}px`,
                top: `${table.y}px`,
                width: '120px',
                height: '120px'
              }}
              onClick={() => handleTableClick(table)}
            >
              {/* Table Shape */}
              <div className={`relative w-full h-full border-2 rounded-lg ${getStatusColor(table.status)} flex items-center justify-center shadow-lg ${
                editMode ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
              }`}>
                {/* Table Icon */}
                <div className="text-center">
                  {getTableIcon(table.shape, 'large')}
                  <div className="mt-1">
                    <div className="font-bold text-lg">T{table.number}</div>
                    <div className="text-xs opacity-75">{table.seats} {t('tables.seats')}</div>
                  </div>
                </div>

                {/* Edit Mode Indicator */}
                {editMode && (
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center justify-center">
                    <Edit className="w-3 h-3" />
                  </div>
                )}

                {/* Order Count Badge */}
                {!editMode && table.currentOrders && table.currentOrders.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center">
                    {table.currentOrders.length}
                  </div>
                )}

                {/* Seat Numbers */}
                {!editMode && renderTableSeats(table)}
              </div>

              {/* Table Info Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 transition-opacity bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                {t('tables.table')} {table.number} • {table.seats} {t('tables.seats')} • {t(`tables.${table.status}`)}
                {table.currentOrders && table.currentOrders.length > 0 && (
                  <span> • {table.currentOrders.length} {t('orders.title')}</span>
                )}
                {editMode && <span> • {t('common.clickToEdit')}</span>}
              </div>
            </div>
          ))}

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-md border border-gray-200 max-w-sm">
            <h4 className="font-semibold text-gray-900 mb-2">
              {editMode ? t('tables.editMode') : t('tables.quickActions')}
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {editMode ? (
                <>
                  <li>• {t('tables.clickToEdit')}</li>
                  <li>• {t('tables.changeProperties')}</li>
                  <li>• {t('tables.clickDoneWhenFinished')}</li>
                </>
              ) : (
                <>
                  <li>• {t('tables.clickTableForOrder')}</li>
                  <li>• {t('tables.clickSeatForSpecific')}</li>
                  <li>• {t('tables.shapesRepresentTypes')}</li>
                  <li>• {t('tables.redBadgeShowsOrders')}</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Table Details Panel */}
      {selectedTable && !showNewOrderModal && !showSeatOrderModal && !showEditModal && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('tables.table')} {selectedTable.number} {t('common.details')}
            </h3>
            <button
              onClick={() => setSelectedTable(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getTableIcon(selectedTable.shape)}
                <span className="font-medium">{t('tables.shape')}: {t(`tables.${selectedTable.shape}`)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span>{t('tables.capacity')}: {selectedTable.seats} {t('tables.seats')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(selectedTable.status)}`}>
                  {t(`tables.${selectedTable.status}`).toUpperCase()}
                </span>
              </div>
            </div>

            {selectedTable.currentOrders && selectedTable.currentOrders.length > 0 && (
              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-900 mb-3">{t('orders.title')}</h4>
                <div className="space-y-2">
                  {selectedTable.currentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{t('orders.orderNumber')}{order.id.slice(0, 8)}</span>
                        <span className="text-gray-600 ml-2">{order.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">${order.total}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                          {t(`orders.${order.status}`)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {t('tables.editTable')}
            </button>
            <button
              onClick={() => setShowNewOrderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('orders.newOrder')}
            </button>
            <button
              onClick={() => console.log('View orders for table', selectedTable.number)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {t('tables.viewOrders')}
            </button>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => {
          setShowNewOrderModal(false);
          setSelectedTable(null);
        }}
        onOrderPlaced={handleOrderPlaced}
        prefilledTableNumber={selectedTable?.number}
      />

      {/* Seat-Specific Order Modal */}
      <SeatOrderModal
        isOpen={showSeatOrderModal}
        onClose={() => {
          setShowSeatOrderModal(false);
          setSelectedTable(null);
          setSelectedSeat(null);
        }}
        table={selectedTable}
        seatNumber={selectedSeat}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Table Edit Modal */}
      <TableEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTable(null);
        }}
        table={selectedTable}
        onTableUpdated={handleTableUpdated}
      />
    </div>
  );
}