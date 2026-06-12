/**
 * Redux Analytics & Notifications Slices
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AnalyticsState {
  dashboardData: Record<string, any>;
  chartsData: Record<string, any>;
  isLoading: boolean;
}

export interface NotificationsState {
  items: any[];
  unreadCount: number;
}

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: { dashboardData: {}, chartsData: {}, isLoading: false } as AnalyticsState,
  reducers: {
    setDashboardData: (state, action: PayloadAction<Record<string, any>>) => {
      state.dashboardData = action.payload;
    },
    setChartsData: (state, action: PayloadAction<Record<string, any>>) => {
      state.chartsData = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0 } as NotificationsState,
  reducers: {
    addNotification: (state, action: PayloadAction<any>) => {
      state.items.push(action.payload);
      state.unreadCount += 1;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.items.find((n) => n.id === action.payload);
      if (notification) notification.read = true;
      state.unreadCount = state.items.filter((n) => !n.read).length;
    },
    clearAll: (state) => {
      state.items = [];
      state.unreadCount = 0;
    },
  },
});

export const { setDashboardData, setChartsData, setLoading } = analyticsSlice.actions;
export const { addNotification, markAsRead, clearAll } = notificationsSlice.actions;

export default {
  analytics: analyticsSlice.reducer,
  notifications: notificationsSlice.reducer,
};
