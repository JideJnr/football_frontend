export interface Room {
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

export interface GetAllRoomsResponse {
  success: true;
  count: number;
  rooms: Room[];
}

export interface GetAvailableRoomsResponse {
  success: true;
  count: number;
  rooms: Room[];
}

export interface SingleRoomResponse {
  success: true;
  room: Room;
}

export interface DeleteRoomResponse {
  success: true;
  message: string;
}


export interface ApiErrorResponse {
  success: false;
  error: string;
}

export interface LoginSuccessResponse {
  success: true;
  token: string;
  user: {
    uid: string;
    email: string;
    firstName: string;
    role: string;
  };
}


export interface SignupSuccessResponse {
  success: true;
  token: string;
  user: {
    uid: string;
    email: string;
    firstName: string;
    role: string;
  }
}


export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface GetAllCustomersResponse {
  success: true;
  count: number;
  customers: Customer[];
}

export interface SingleCustomerResponse {
  success: true;
  customer: Customer;
}

export interface DeleteCustomerResponse {
  success: true;
  message: string;
}


export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  receiptUrl?: string;
}

export interface GetAllExpensesResponse {
  success: true;
  count: number;
  expenses: Expense[];
}

export interface SingleExpenseResponse {
  success: true;
  expense: Expense;
}

export interface DeleteExpenseResponse {
  success: true;
  message: string;
}