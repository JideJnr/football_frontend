import { create } from 'zustand';
import * as api from '../services/api';

interface Booking {
  id: string;
  number: string;
  type: string;
  price: number;
  capacity: number;
  amenities: string[];
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BookingState {
  Booking: Booking[];
  availableBooking: Booking[];
  currentBooking: Booking | null;
  loading: boolean;
  error: string | null;

  
}

export const useBookingStore = create<BookingState>((set, get) => ({
  Booking: [],
  availableBooking: [],
  availableCountry: [],
  currentBooking: null,
  currentCountry: null,
  loading: false,
  error: null,

  fetchPredictionByDate: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAllPredictionsByDate('date');
      if (!response.success) throw new Error(response.error || 'Failed to fetch Booking');
      set({ Booking: response.Booking, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },


}));