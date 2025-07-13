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

  fetchBookingByDate: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getBookingByDate();
      if (!response.success) throw new Error(response.error || 'Failed to fetch Booking');
      set({ Booking: response.Booking, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getRunningBooking: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getRunningBookings();
      if (!response.success) throw new Error(response.error || 'Failed to fetch available Booking');
      set({ availableBooking: response.Booking, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getBookingById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getBookingById(id);
      if (!response.success) throw new Error(response.error || 'Booking not found');
      set({ currentBooking: response.Booking, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

}));