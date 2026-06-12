import { API_BASE_URL } from '../config/apiBaseResolver';

const API_BASE = API_BASE_URL;


export const checkUsersExist = async () => {
  try {
    const response = await fetch(`${API_BASE}/auth/setup-status`);
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.data?.usersExist);
  } catch {
    return false;
  }
};

export const setupInitialAdmin = async (email, password, name) => {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role: 'admin' })
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to create admin user' };
    }
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default {
  checkUsersExist,
  setupInitialAdmin
};
