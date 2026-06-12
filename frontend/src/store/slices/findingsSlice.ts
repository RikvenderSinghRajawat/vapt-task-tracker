/**
 * Redux Findings Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_CONFIG } from '../../config/api.config';

export interface IFinding {
  _id: string;
  projectId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: string;
  cvssScore?: number;
  createdAt: Date;
}

export interface FindingsState {
  findings: IFinding[];
  selectedFinding: IFinding | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  filters: {
    projectId?: string;
    severity?: string;
    status?: string;
  };
}

const initialState: FindingsState = {
  findings: [],
  selectedFinding: null,
  isLoading: false,
  error: null,
  total: 0,
  filters: {},
};

export const fetchFindings = createAsyncThunk(
  'findings/fetchAll',
  async (filters: Record<string, string>, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_CONFIG.BASE_URL}/findings?${params}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch findings');
    }
  }
);

const findingsSlice = createSlice({
  name: 'findings',
  initialState,
  reducers: {
    setSelectedFinding: (state, action: PayloadAction<IFinding | null>) => {
      state.selectedFinding = action.payload;
    },
    setFilters: (state, action: PayloadAction<Record<string, string>>) => {
      state.filters = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFindings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFindings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.findings = action.payload;
      })
      .addCase(fetchFindings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedFinding, setFilters } = findingsSlice.actions;
export default findingsSlice.reducer;
