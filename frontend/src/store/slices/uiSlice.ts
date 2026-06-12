/**
 * Redux UI/Notifications Slices
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UIState {
  notifications: Notification[];
  isLoading: boolean;
  isDarkMode: boolean;
  sidebarOpen: boolean;
  selectedFilters: Record<string, string>;
}

const initialState: UIState = {
  notifications: [],
  isLoading: false,
  isDarkMode: localStorage.getItem('theme') === 'dark',
  sidebarOpen: true,
  selectedFilters: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.push(action.payload);
      if (action.payload.duration) {
        setTimeout(() => {
          uiSlice.caseReducers.removeNotification(state, PayloadAction({} as any));
        }, action.payload.duration);
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
      localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setFilters: (state, action: PayloadAction<Record<string, string>>) => {
      state.selectedFilters = action.payload;
    },
  },
});

export const {
  addNotification,
  removeNotification,
  setLoading,
  toggleTheme,
  toggleSidebar,
  setFilters,
} = uiSlice.actions;
export default uiSlice.reducer;
