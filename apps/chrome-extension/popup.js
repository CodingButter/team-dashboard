// Popup JavaScript for Team Dashboard Chrome Extension

class PopupManager {
  constructor() {
    this.setupEventListeners();
    this.updateStatus();
  }

  setupEventListeners() {
    document.getElementById('openSidePanel').addEventListener('click', () => {
      this.openSidePanel();
    });

    document.getElementById('openDashboard').addEventListener('click', () => {
      this.openDashboard();
    });

    document.getElementById('syncData').addEventListener('click', () => {
      this.syncData();
    });
  }

  async openSidePanel() {
    try {
      // Open side panel for current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    } catch (error) {
      console.error('Failed to open side panel:', error);
      this.showError('Failed to open side panel');
    }
  }

  async openDashboard() {
    try {
      const url = 'http://localhost:3000'; // TODO: Make configurable
      await chrome.tabs.create({ url });
      window.close();
    } catch (error) {
      console.error('Failed to open dashboard:', error);
      this.showError('Failed to open dashboard');
    }
  }

  async syncData() {
    try {
      const syncBtn = document.getElementById('syncData');
      syncBtn.textContent = 'Syncing...';
      syncBtn.disabled = true;

      const response = await this.sendMessage({ type: 'SYNC_WITH_DASHBOARD' });
      
      if (response.success) {
        this.showStatus('Sync successful', 'connected');
        setTimeout(() => {
          this.updateStatus();
        }, 2000);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      this.showStatus('Sync failed', 'disconnected');
    } finally {
      const syncBtn = document.getElementById('syncData');
      syncBtn.innerHTML = '<span class="icon">🔄</span><span>Sync Data</span>';
      syncBtn.disabled = false;
    }
  }

  async updateStatus() {
    try {
      const response = await this.sendMessage({ type: 'SYNC_WITH_DASHBOARD' });
      
      if (response.success) {
        this.showStatus('Connected to dashboard', 'connected');
      } else {
        this.showStatus('Disconnected', 'disconnected');
      }
    } catch (error) {
      this.showStatus('Connection error', 'disconnected');
    }
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
  }

  showError(message) {
    this.showStatus(message, 'disconnected');
  }

  async sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});