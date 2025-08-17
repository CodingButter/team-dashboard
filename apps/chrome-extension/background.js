// Service Worker for Team Dashboard Chrome Extension
// Manifest V3 background script with proper error handling

class TeamDashboardBackground {
  constructor() {
    this.apiEndpoint = 'http://localhost:3000';
    this.initializeExtension();
  }

  initializeExtension() {
    // Handle extension installation and updates
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle side panel communication
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Indicates async response
    });

    // Handle storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      this.handleStorageChanges(changes, areaName);
    });

    // Set up periodic sync
    this.setupPeriodicSync();
  }

  async handleInstallation(details) {
    try {
      if (details.reason === 'install') {
        // First time installation
        await this.initializeStorage();
        await this.setupSidePanel();
        console.log('Team Dashboard extension installed successfully');
      } else if (details.reason === 'update') {
        // Extension update
        await this.handleExtensionUpdate(details.previousVersion);
        console.log(`Extension updated from ${details.previousVersion} to ${chrome.runtime.getManifest().version}`);
      }
    } catch (error) {
      console.error('Installation/update error:', error);
      await this.reportError('installation', error);
    }
  }

  async initializeStorage() {
    try {
      const defaultData = {
        teamData: {},
        agentConfigs: {},
        dashboardState: {
          isConnected: false,
          lastSync: null,
          syncInterval: 30000 // 30 seconds
        },
        userPreferences: {
          sidePanel: true,
          notifications: true,
          autoSync: true
        }
      };

      // Use chrome.storage.sync for user preferences (limited size)
      await chrome.storage.sync.set({
        userPreferences: defaultData.userPreferences
      });

      // Use chrome.storage.local for larger data
      await chrome.storage.local.set({
        teamData: defaultData.teamData,
        agentConfigs: defaultData.agentConfigs,
        dashboardState: defaultData.dashboardState
      });

      console.log('Storage initialized successfully');
    } catch (error) {
      console.error('Storage initialization error:', error);
      throw error;
    }
  }

  async setupSidePanel() {
    try {
      // Enable side panel for all tabs
      await chrome.sidePanel.setOptions({
        enabled: true,
        path: 'sidepanel.html'
      });
      console.log('Side panel configured successfully');
    } catch (error) {
      console.error('Side panel setup error:', error);
      throw error;
    }
  }

  async handleExtensionUpdate(previousVersion) {
    try {
      // Handle data migration between versions
      const currentVersion = chrome.runtime.getManifest().version;
      
      if (this.shouldMigrateData(previousVersion, currentVersion)) {
        await this.migrateStorageData(previousVersion);
      }

      // Update side panel if needed
      await this.setupSidePanel();
      
      // Clear any cached data that might be incompatible
      await this.clearIncompatibleCache(previousVersion);
      
    } catch (error) {
      console.error('Extension update error:', error);
      throw error;
    }
  }

  shouldMigrateData(fromVersion, toVersion) {
    // Add version comparison logic here
    return true; // For now, always migrate
  }

  async migrateStorageData(fromVersion) {
    try {
      const localData = await chrome.storage.local.get();
      const syncData = await chrome.storage.sync.get();
      
      // Migration logic based on version
      console.log(`Migrating data from version ${fromVersion}`);
      
      // Example migration: ensure dashboardState has required fields
      if (localData.dashboardState) {
        localData.dashboardState.syncInterval = localData.dashboardState.syncInterval || 30000;
        await chrome.storage.local.set({ dashboardState: localData.dashboardState });
      }
      
    } catch (error) {
      console.error('Data migration error:', error);
      throw error;
    }
  }

  async clearIncompatibleCache(fromVersion) {
    try {
      // Clear cached data that might be incompatible with new version
      const data = await chrome.storage.local.get();
      if (data.cachedResponses) {
        await chrome.storage.local.remove('cachedResponses');
      }
    } catch (error) {
      console.error('Cache clearing error:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_TEAM_DATA':
          const teamData = await this.getTeamData();
          sendResponse({ success: true, data: teamData });
          break;

        case 'UPDATE_TEAM_DATA':
          await this.updateTeamData(message.data);
          sendResponse({ success: true });
          break;

        case 'SYNC_WITH_DASHBOARD':
          const syncResult = await this.syncWithDashboard();
          sendResponse({ success: true, data: syncResult });
          break;

        case 'GET_AGENT_STATUS':
          const agentStatus = await this.getAgentStatus();
          sendResponse({ success: true, data: agentStatus });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
      await this.reportError('message_handling', error);
    }
  }

  async handleStorageChanges(changes, areaName) {
    try {
      console.log('Storage changes detected:', { changes, areaName });
      
      // Handle conflicts in chrome.storage.sync
      if (areaName === 'sync') {
        await this.resolveStorageConflicts(changes);
      }
      
      // Notify side panel of changes
      await this.notifySidePanelOfChanges(changes, areaName);
      
    } catch (error) {
      console.error('Storage change handling error:', error);
      await this.reportError('storage_changes', error);
    }
  }

  async resolveStorageConflicts(changes) {
    try {
      // Implement conflict resolution logic for sync storage
      for (const [key, change] of Object.entries(changes)) {
        if (change.oldValue && change.newValue) {
          // Merge strategy for conflicts
          const merged = await this.mergeStorageValues(key, change.oldValue, change.newValue);
          if (merged !== change.newValue) {
            await chrome.storage.sync.set({ [key]: merged });
          }
        }
      }
    } catch (error) {
      console.error('Storage conflict resolution error:', error);
      throw error;
    }
  }

  async mergeStorageValues(key, oldValue, newValue) {
    // Implement smart merging based on data type and key
    if (key === 'userPreferences') {
      return { ...oldValue, ...newValue };
    }
    
    // Default: use newest value
    return newValue;
  }

  async notifySidePanelOfChanges(changes, areaName) {
    try {
      // Send message to side panel about storage changes
      const tabs = await chrome.tabs.query({ active: true });
      if (tabs.length > 0) {
        await chrome.runtime.sendMessage({
          type: 'STORAGE_CHANGED',
          changes,
          areaName
        });
      }
    } catch (error) {
      // Side panel might not be open, ignore error
      console.log('Side panel not available for notification');
    }
  }

  async getTeamData() {
    try {
      const result = await chrome.storage.local.get('teamData');
      return result.teamData || {};
    } catch (error) {
      console.error('Error getting team data:', error);
      throw error;
    }
  }

  async updateTeamData(data) {
    try {
      const current = await this.getTeamData();
      const updated = { ...current, ...data };
      
      await chrome.storage.local.set({ teamData: updated });
      
      // Also sync to dashboard if connected
      await this.syncToExternalDashboard(updated);
      
    } catch (error) {
      console.error('Error updating team data:', error);
      throw error;
    }
  }

  async syncWithDashboard() {
    try {
      const response = await fetch(`${this.apiEndpoint}/api/sync`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Dashboard sync failed: ${response.status}`);
      }

      const dashboardData = await response.json();
      await this.updateTeamData(dashboardData);
      
      // Update sync status
      await chrome.storage.local.set({
        dashboardState: {
          isConnected: true,
          lastSync: Date.now(),
          syncInterval: 30000
        }
      });

      return dashboardData;
    } catch (error) {
      console.error('Dashboard sync error:', error);
      
      // Update connection status
      await chrome.storage.local.set({
        dashboardState: {
          isConnected: false,
          lastSync: null,
          syncInterval: 30000
        }
      });
      
      throw error;
    }
  }

  async syncToExternalDashboard(data) {
    try {
      const response = await fetch(`${this.apiEndpoint}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        console.error('Failed to sync to external dashboard:', response.status);
      }
    } catch (error) {
      console.error('External dashboard sync error:', error);
      // Don't throw - this is a background operation
    }
  }

  async getAgentStatus() {
    try {
      const response = await fetch(`${this.apiEndpoint}/api/agents/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Agent status fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Agent status error:', error);
      throw error;
    }
  }

  setupPeriodicSync() {
    // Set up periodic sync every 30 seconds
    setInterval(async () => {
      try {
        const prefs = await chrome.storage.sync.get('userPreferences');
        if (prefs.userPreferences?.autoSync) {
          await this.syncWithDashboard();
        }
      } catch (error) {
        console.error('Periodic sync error:', error);
      }
    }, 30000);
  }

  async reportError(context, error) {
    try {
      // Log error to extension storage for debugging
      const errorLog = {
        timestamp: Date.now(),
        context,
        error: error.message,
        stack: error.stack
      };

      const existing = await chrome.storage.local.get('errorLog');
      const errors = existing.errorLog || [];
      errors.push(errorLog);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      await chrome.storage.local.set({ errorLog: errors });
    } catch (logError) {
      console.error('Error logging failed:', logError);
    }
  }
}

// Initialize the background service
const teamDashboard = new TeamDashboardBackground();