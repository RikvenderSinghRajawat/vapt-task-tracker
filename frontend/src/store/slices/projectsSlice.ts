/**
 * Redux Projects Slice
 * Manages projects state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_CONFIG } from '../../config/api.config';

export interface IProject {
  _id: string;
  name: string;
  code: string;
  status: string;
  priority: string;
  manager: string;
  startDate: Date;
  createdAt: Date;
}

export interface ProjectsState {
  projects: IProject[];
  filteredProjects: IProject[];
  selectedProject: IProject | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  filters: {
    status?: string;
    priority?: string;
    search?: string;
  };
}

const initialState: ProjectsState = {
  projects: [],
  filteredProjects: [],
  selectedProject: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  filters: {},
};

// Async Thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (
    { page, limit, filters }: { page: number; limit: number; filters?: Record<string, string> },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      const response = await axios.get(`${API_CONFIG.BASE_URL}/projects?${params}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch projects');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/create',
  async (projectData: Partial<IProject>, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_CONFIG.BASE_URL}/projects`, projectData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create project');
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, data }: { id: string; data: Partial<IProject> }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_CONFIG.BASE_URL}/projects/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update project');
    }
  }
);

// Redux Slice
const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setSelectedProject: (state, action: PayloadAction<IProject | null>) => {
      state.selectedProject = action.payload;
    },
    setFilters: (state, action: PayloadAction<Record<string, string>>) => {
      state.filters = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects = action.payload.data;
        state.filteredProjects = action.payload.data;
        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Project
    builder
      .addCase(createProject.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects.push(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Project
    builder
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
      });
  },
});

export const { setSelectedProject, setFilters, clearError } = projectsSlice.actions;
export default projectsSlice.reducer;
