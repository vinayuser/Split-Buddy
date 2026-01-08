import api from '../config/api';

// Auth APIs
export const authAPI = {
  sendOTP: async (phone, email) => {
    try {
      // Only send non-null values
      const payload = {};
      if (phone) payload.phone = phone;
      if (email) payload.email = email;
      
      const response = await api.post('/auth/send-otp', payload);
      return response.data;
    } catch (error) {
      console.error('Send OTP API error:', error);
      // Log more details for debugging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  },
  verifyOTP: async (userId, otp) => {
    try {
      if (!userId || !otp) {
        throw new Error('User ID and OTP are required');
      }
      // Ensure both are strings
      const payload = {
        userId: String(userId).trim(),
        otp: String(otp).trim()
      };
      console.log('Sending verify OTP request:', payload);
      const response = await api.post('/auth/verify-otp', payload);
      return response.data;
    } catch (error) {
      console.error('Verify OTP API error:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// User APIs
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },
};

// Group APIs
export const groupAPI = {
  getGroups: async () => {
    const response = await api.get('/groups');
    return response.data;
  },
  getGroup: async (groupId) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },
  getGroupDetail: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/detail`);
    return response.data;
  },
  createGroup: async (data) => {
    const response = await api.post('/groups', data);
    return response.data;
  },
  updateGroup: async (groupId, data) => {
    const response = await api.put(`/groups/${groupId}`, data);
    return response.data;
  },
  joinGroup: async (inviteCode) => {
    const response = await api.post('/groups/join', { inviteCode });
    return response.data;
  },
  inviteMember: async (groupId, email, phone) => {
    const response = await api.post(`/groups/${groupId}/invite`, { email, phone });
    return response.data;
  },
  leaveGroup: async (groupId) => {
    const response = await api.post(`/groups/${groupId}/leave`);
    return response.data;
  },
  removeMember: async (groupId, memberId) => {
    const response = await api.delete(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  },
  archiveGroup: async (groupId) => {
    const response = await api.post(`/groups/${groupId}/archive`);
    return response.data;
  },
  unarchiveGroup: async (groupId) => {
    const response = await api.post(`/groups/${groupId}/unarchive`);
    return response.data;
  },
};

// Expense APIs
export const expenseAPI = {
  getExpenses: async (groupId, page = 1, limit = 20) => {
    const response = await api.get(`/expenses/group/${groupId}?page=${page}&limit=${limit}`);
    return response.data;
  },
  getExpense: async (expenseId) => {
    const response = await api.get(`/expenses/${expenseId}`);
    return response.data;
  },
  createExpense: async (data) => {
    const response = await api.post('/expenses', data);
    return response.data;
  },
  updateExpense: async (expenseId, data) => {
    const response = await api.put(`/expenses/${expenseId}`, data);
    return response.data;
  },
  deleteExpense: async (expenseId) => {
    const response = await api.delete(`/expenses/${expenseId}`);
    return response.data;
  },
};

// Balance APIs
export const balanceAPI = {
  getBalances: async (groupId) => {
    const response = await api.get(`/balances/group/${groupId}`);
    return response.data;
  },
  getNetBalance: async (groupId) => {
    const response = await api.get(`/balances/group/${groupId}/user`);
    return response.data;
  },
  getFriendBalances: async () => {
    const response = await api.get('/balances/friends');
    return response.data;
  },
};

// Settlement APIs
export const settlementAPI = {
  getSettlements: async (groupId) => {
    const response = await api.get(`/settlements/group/${groupId}`);
    return response.data;
  },
  createSettlement: async (data) => {
    const response = await api.post('/settlements', data);
    return response.data;
  },
  deleteSettlement: async (settlementId) => {
    const response = await api.delete(`/settlements/${settlementId}`);
    return response.data;
  },
};

// Subscription APIs
export const subscriptionAPI = {
  getStatus: async () => {
    const response = await api.get('/subscriptions/status');
    return response.data;
  },
  verifySubscription: async (purchaseToken, planType) => {
    const response = await api.post('/subscriptions/verify', {
      purchaseToken,
      planType,
    });
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get('/subscriptions/history');
    return response.data;
  },
};

// Activity APIs
export const activityAPI = {
  getActivities: async (page = 1, limit = 20) => {
    const response = await api.get(`/activities?page=${page}&limit=${limit}`);
    return response.data;
  },
};

// Notification APIs
export const notificationAPI = {
  registerToken: async (fcmToken) => {
    const response = await api.post('/notifications/register-token', { fcmToken });
    return response.data;
  },
  removeToken: async () => {
    const response = await api.post('/notifications/remove-token');
    return response.data;
  },
};

// Banner APIs
export const bannerAPI = {
  getBanners: async (active = true) => {
    const response = await api.get(`/banners?active=${active}`);
    return response.data;
  },
};

