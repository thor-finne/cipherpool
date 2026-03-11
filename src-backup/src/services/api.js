const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }

  // Tournaments
  async createTournament(tournamentData) {
    return this.request('/tournaments', {
      method: 'POST',
      body: JSON.stringify(tournamentData)
    });
  }

  async joinTournament(tournamentId) {
    return this.request(`/tournaments/${tournamentId}/join`, {
      method: 'POST'
    });
  }

  // Support
  async createTicket(ticketData) {
    return this.request('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData)
    });
  }

  async replyToTicket(ticketId, message) {
    return this.request(`/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  // Admin
  async grantCoins(target_user, amount, reason) {
    return this.request('/admin/grant-coins', {
      method: 'POST',
      body: JSON.stringify({ target_user, amount, reason })
    });
  }

  async getAdminLogs() {
    return this.request('/admin/logs');
  }

  // Chat moderation
  async deleteMessage(messageId) {
    return this.request(`/chat/messages/${messageId}`, {
      method: 'DELETE'
    });
  }

  async muteUser(user_id, duration_minutes) {
    return this.request('/chat/mute', {
      method: 'POST',
      body: JSON.stringify({ user_id, duration_minutes })
    });
  }
}

export const api = new ApiService();