// Side Panel JavaScript for Team Dashboard Chrome Extension
// Handles UI interactions and communication with background script

class SidePanelManager {
  constructor() {
    this.currentTab = 'agents';
    this.isConnected = false;
    this.agentsData = [];
    this.settings = {};
    
    this.initializeUI();
    this.loadInitialData();
    this.setupEventListeners();
    this.startPeriodicUpdates();
  }

  initializeUI() {
    this.setupTabNavigation();
    this.setupModals();
  }

  setupTabNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active tab
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        this.currentTab = targetTab;
        this.loadTabContent(targetTab);
      });
    });
  }

  setupModals() {
    // Error Modal
    const errorModal = document.getElementById('errorModal');
    const closeErrorModal = document.getElementById('closeErrorModal');
    const dismissErrorBtn = document.getElementById('dismissErrorBtn');

    [closeErrorModal, dismissErrorBtn].forEach(btn => {
      btn.addEventListener('click', () => this.hideModal('errorModal'));
    });

    // Success Modal
    const successModal = document.getElementById('successModal');
    const closeSuccessModal = document.getElementById('closeSuccessModal');
    const dismissSuccessBtn = document.getElementById('dismissSuccessBtn');

    [closeSuccessModal, dismissSuccessBtn].forEach(btn => {
      btn.addEventListener('click', () => this.hideModal('successModal'));
    });
  }

  setupEventListeners() {
    // Quick Actions
    document.getElementById('syncBtn').addEventListener('click', () => this.syncData());
    document.getElementById('openDashboardBtn').addEventListener('click', () => this.openDashboard());
    
    // Settings
    document.getElementById('autoSyncSetting').addEventListener('change', (e) => {
      this.updateSetting('autoSync', e.target.checked);
    });
    
    document.getElementById('notificationsSetting').addEventListener('change', (e) => {
      this.updateSetting('notifications', e.target.checked);
    });
    
    document.getElementById('sidePanelSetting').addEventListener('change', (e) => {
      this.updateSetting('sidePanel', e.target.checked);
    });
    
    document.getElementById('testConnectionBtn').addEventListener('click', () => this.testConnection());
    document.getElementById('clearStorageBtn').addEventListener('click', () => this.clearStorage());
    document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());

    // Listen for storage changes from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'STORAGE_CHANGED') {
        this.handleStorageChanges(message.changes, message.areaName);
      }
    });
  }

  async loadInitialData() {
    try {
      await this.updateConnectionStatus();
      await this.loadSettings();
      await this.loadTabContent(this.currentTab);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showError('Failed to load extension data');
    }
  }

  async loadTabContent(tabName) {
    switch (tabName) {
      case 'agents':
        await this.loadAgentsTab();
        break;
      case 'dashboard':
        await this.loadDashboardTab();
        break;
      case 'settings':
        await this.loadSettingsTab();
        break;
    }
  }

  async loadAgentsTab() {
    try {
      this.showLoading('agentsList');
      
      const response = await this.sendMessage({ type: 'GET_AGENT_STATUS' });
      if (response.success) {
        this.agentsData = response.data;
        this.renderAgentsList();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      this.showError('Failed to load agents data');
      this.renderAgentsError();
    }
  }

  async loadDashboardTab() {
    try {
      this.showLoading('teamOverview');
      this.showLoading('recentActivity');
      
      const response = await this.sendMessage({ type: 'GET_TEAM_DATA' });
      if (response.success) {
        this.renderTeamOverview(response.data);
        this.renderRecentActivity(response.data);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      this.showError('Failed to load dashboard data');
    }
  }

  async loadSettingsTab() {
    await this.loadStorageInfo();
  }

  renderAgentsList() {
    const container = document.getElementById('agentsList');
    
    if (!this.agentsData || this.agentsData.length === 0) {
      container.innerHTML = '<div class="empty-state">No agents currently active</div>';
      return;
    }

    const agentsHTML = this.agentsData.map(agent => `
      <div class="agent-card">
        <div class="agent-header">
          <span class="agent-name">${agent.name}</span>
          <span class="agent-status ${agent.status.toLowerCase()}">${agent.status}</span>
        </div>
        <div class="agent-details">
          <div class="agent-task">${agent.currentTask || 'Idle'}</div>
          <div class="agent-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${agent.progress || 0}%"></div>
            </div>
            <span class="progress-text">${agent.progress || 0}%</span>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = agentsHTML;
  }

  renderAgentsError() {
    const container = document.getElementById('agentsList');
    container.innerHTML = '<div class="error-state">Failed to load agents</div>';
  }

  renderTeamOverview(data) {
    const container = document.getElementById('teamOverview');
    
    const overview = `
      <div class="overview-stats">
        <div class="stat-card">
          <div class="stat-number">${data.activeAgents || 0}</div>
          <div class="stat-label">Active Agents</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${data.completedTasks || 0}</div>
          <div class="stat-label">Completed Tasks</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${data.pendingTasks || 0}</div>
          <div class="stat-label">Pending Tasks</div>
        </div>
      </div>
    `;

    container.innerHTML = overview;
  }

  renderRecentActivity(data) {
    const container = document.getElementById('recentActivity');
    
    if (!data.recentActivity || data.recentActivity.length === 0) {
      container.innerHTML = '<div class="empty-state">No recent activity</div>';
      return;
    }

    const activityHTML = data.recentActivity.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${activity.icon || '📋'}</div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
        </div>
      </div>
    `).join('');

    container.innerHTML = activityHTML;
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('userPreferences');
      this.settings = result.userPreferences || {};
      
      // Update UI with current settings
      document.getElementById('autoSyncSetting').checked = this.settings.autoSync || false;
      document.getElementById('notificationsSetting').checked = this.settings.notifications || false;
      document.getElementById('sidePanelSetting').checked = this.settings.sidePanel || false;
      
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadStorageInfo() {
    try {
      const local = await chrome.storage.local.getBytesInUse();
      const sync = await chrome.storage.sync.getBytesInUse();
      
      const container = document.getElementById('storageUsage');
      container.innerHTML = `
        <div class="storage-stat">
          <span class="storage-label">Local Storage:</span>
          <span class="storage-value">${this.formatBytes(local)}</span>
        </div>
        <div class="storage-stat">
          <span class="storage-label">Sync Storage:</span>
          <span class="storage-value">${this.formatBytes(sync)}</span>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  }

  async updateConnectionStatus() {
    try {
      const response = await this.sendMessage({ type: 'SYNC_WITH_DASHBOARD' });
      this.isConnected = response.success;
      
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');
      
      if (this.isConnected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected';
      } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Disconnected';
      }
    } catch (error) {
      console.error('Connection status update failed:', error);
      this.isConnected = false;
      
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Error';
    }
  }

  async syncData() {
    try {
      this.showLoading('syncBtn', 'Syncing...');
      
      const response = await this.sendMessage({ type: 'SYNC_WITH_DASHBOARD' });
      if (response.success) {
        this.showSuccess('Data synchronized successfully');
        await this.updateConnectionStatus();
        await this.loadTabContent(this.currentTab);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      this.showError('Failed to sync data with dashboard');
    } finally {
      this.hideLoading('syncBtn', 'Sync Data');
    }
  }

  async openDashboard() {
    try {
      const url = 'http://localhost:3000'; // TODO: Make configurable
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('Failed to open dashboard:', error);
      this.showError('Failed to open dashboard');
    }
  }

  async updateSetting(key, value) {
    try {
      this.settings[key] = value;
      await chrome.storage.sync.set({ userPreferences: this.settings });
    } catch (error) {
      console.error('Failed to update setting:', error);
      this.showError('Failed to save settings');
    }
  }

  async testConnection() {
    try {
      this.showLoading('testConnectionBtn', 'Testing...');
      
      const response = await this.sendMessage({ type: 'SYNC_WITH_DASHBOARD' });
      if (response.success) {
        this.showSuccess('Connection test successful');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      this.showError('Connection test failed');
    } finally {
      this.hideLoading('testConnectionBtn', 'Test Connection');
    }
  }

  async clearStorage() {
    if (confirm('Are you sure you want to clear all extension data? This cannot be undone.')) {
      try {
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
        this.showSuccess('Storage cleared successfully');
        await this.loadInitialData();
      } catch (error) {
        console.error('Failed to clear storage:', error);
        this.showError('Failed to clear storage');
      }
    }
  }

  async exportData() {
    try {
      const localData = await chrome.storage.local.get();
      const syncData = await chrome.storage.sync.get();
      
      const exportData = {
        local: localData,
        sync: syncData,
        timestamp: Date.now()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-dashboard-extension-data-${Date.now()}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showSuccess('Data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      this.showError('Failed to export data');
    }
  }

  handleStorageChanges(changes, areaName) {
    console.log('Storage changes received:', { changes, areaName });
    
    // Reload current tab content if relevant data changed
    if (areaName === 'local' && changes.teamData) {
      if (this.currentTab === 'dashboard') {
        this.loadDashboardTab();
      }
    }
    
    if (areaName === 'sync' && changes.userPreferences) {
      this.loadSettings();
    }
  }

  startPeriodicUpdates() {
    // Update connection status every 30 seconds
    setInterval(() => {
      this.updateConnectionStatus();
    }, 30000);
    
    // Refresh current tab data every 60 seconds
    setInterval(() => {
      if (this.currentTab === 'agents' || this.currentTab === 'dashboard') {
        this.loadTabContent(this.currentTab);
      }
    }, 60000);
  }

  // Utility methods
  async sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  showLoading(elementId, text = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `<div class="loading">${text}</div>`;
    }
  }

  hideLoading(elementId, originalText) {
    const element = document.getElementById(elementId);
    if (element && element.tagName === 'BUTTON') {
      element.textContent = originalText;
      element.disabled = false;
    }
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  showError(message) {
    document.getElementById('errorMessage').textContent = message;
    this.showModal('errorModal');
  }

  showSuccess(message) {
    document.getElementById('successMessage').textContent = message;
    this.showModal('successModal');
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize the side panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SidePanelManager();
});