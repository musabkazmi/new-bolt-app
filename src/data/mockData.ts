import { Order, Table } from '../types';

export const mockOrders: Order[] = [
  {
    id: '1',
    tableNumber: 3,
    customerName: 'John Smith',
    items: [
      {
        id: '1',
        name: 'Margherita Pizza',
        price: 18.99,
        quantity: 1,
        status: 'preparing'
      },
      {
        id: '2',
        name: 'Caesar Salad',
        price: 12.99,
        quantity: 1,
        status: 'ready'
      }
    ],
    status: 'preparing',
    total: 31.98,
    timestamp: new Date().toISOString(),
    waiterId: '2'
  },
  {
    id: '2',
    tableNumber: 5,
    customerName: 'Sarah Johnson',
    items: [
      {
        id: '3',
        name: 'Grilled Salmon',
        price: 24.99,
        quantity: 1,
        status: 'pending'
      }
    ],
    status: 'pending',
    total: 24.99,
    timestamp: new Date(Date.now() - 300000).toISOString(),
    waiterId: '2'
  },
  {
    id: '3',
    tableNumber: 7,
    customerName: 'Mike Davis',
    items: [
      {
        id: '4',
        name: 'Chicken Alfredo',
        price: 19.99,
        quantity: 2,
        status: 'ready'
      }
    ],
    status: 'ready',
    total: 39.98,
    timestamp: new Date(Date.now() - 600000).toISOString(),
    waiterId: '3'
  }
];

export const mockTables: Table[] = [
  {
    id: '1',
    number: 1,
    seats: 2,
    status: 'available'
  },
  {
    id: '2',
    number: 2,
    seats: 4,
    status: 'available'
  },
  {
    id: '3',
    number: 3,
    seats: 4,
    status: 'occupied',
    currentOrder: '1'
  },
  {
    id: '4',
    number: 4,
    seats: 6,
    status: 'available'
  },
  {
    id: '5',
    number: 5,
    seats: 2,
    status: 'occupied',
    currentOrder: '2'
  },
  {
    id: '6',
    number: 6,
    seats: 4,
    status: 'reserved'
  },
  {
    id: '7',
    number: 7,
    seats: 6,
    status: 'occupied',
    currentOrder: '3'
  },
  {
    id: '8',
    number: 8,
    seats: 8,
    status: 'available'
  }
];