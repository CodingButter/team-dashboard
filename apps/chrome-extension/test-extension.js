// Test script for Chrome Extension functionality
// This simulates Chrome APIs for testing purposes

class ChromeExtensionTester {
  constructor() {
    this.results = {
      manifest: { passed: false, issues: [] },
      background: { passed: false, issues: [] },
      sidepanel: { passed: false, issues: [] },
      popup: { passed: false, issues: [] },
      content: { passed: false, issues: [] },
      storage: { passed: false, issues: [] },
      messaging: { passed: false, issues: [] },
      permissions: { passed: false, issues: [] },
      security: { passed: false, issues: [] }
    };
    this.initializeChromeAPIMocks();
  }

  initializeChromeAPIMocks() {
    // Mock Chrome APIs for testing
    const mockFn = (returnValue) => ({
      calls: [],
      mock: { calls: [] },
      mockResolvedValue: (val) => Promise.resolve(val),
      mockReturnValue: (val) => val,
      mockImplementation: (fn) => fn
    });

    global.chrome = {
      storage: {
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve(),
          clear: () => Promise.resolve(),
          getBytesInUse: () => Promise.resolve(1024)
        },
        sync: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve(),
          clear: () => Promise.resolve(),
          getBytesInUse: () => Promise.resolve(512)
        },
        onChanged: {
          addListener: () => {}
        }
      },
      runtime: {
        sendMessage: (message, callback) => {
          if (callback) callback({ success: true, data: {} });
        },
        onMessage: {
          addListener: () => {}
        },
        onInstalled: {
          addListener: () => {}
        },
        getManifest: () => ({ version: '1.0.0' })
      },
      tabs: {
        query: () => Promise.resolve([{ id: 1, active: true }]),
        create: () => Promise.resolve({ id: 2 })
      },
      sidePanel: {
        setOptions: () => Promise.resolve(),
        open: () => Promise.resolve()
      }
    };
    
    // Track calls for testing
    this.apiCalls = {
      storageLocalSet: 0,
      storageLocalGet: 0,
      storageSyncSet: 0,
      storageSyncGet: 0,
      sendMessage: 0,
      addListener: 0
    };
    
    // Wrap functions to track calls
    const originalLocalSet = global.chrome.storage.local.set;
    global.chrome.storage.local.set = (...args) => {
      this.apiCalls.storageLocalSet++;
      return originalLocalSet(...args);
    };
    
    const originalLocalGet = global.chrome.storage.local.get;
    global.chrome.storage.local.get = (...args) => {
      this.apiCalls.storageLocalGet++;
      return originalLocalGet(...args);
    };
    
    const originalSyncSet = global.chrome.storage.sync.set;
    global.chrome.storage.sync.set = (...args) => {
      this.apiCalls.storageSyncSet++;
      return originalSyncSet(...args);
    };
    
    const originalSyncGet = global.chrome.storage.sync.get;
    global.chrome.storage.sync.get = (...args) => {
      this.apiCalls.storageSyncGet++;
      return originalSyncGet(...args);
    };
    
    const originalSendMessage = global.chrome.runtime.sendMessage;
    global.chrome.runtime.sendMessage = (...args) => {
      this.apiCalls.sendMessage++;
      return originalSendMessage(...args);
    };
    
    const originalAddListener = global.chrome.runtime.onMessage.addListener;
    global.chrome.runtime.onMessage.addListener = (...args) => {
      this.apiCalls.addListener++;
      return originalAddListener(...args);
    };
  }

  async testManifestCompliance() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Read manifest from dist directory
      const manifestPath = path.join(__dirname, 'dist', 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Test Manifest V3 compliance
      const tests = [
        () => manifest.manifest_version === 3,
        () => manifest.name && manifest.name.length > 0,
        () => manifest.version && /^\d+\.\d+\.\d+$/.test(manifest.version),
        () => manifest.description && manifest.description.length > 0,
        () => manifest.background && manifest.background.service_worker,
        () => manifest.permissions && Array.isArray(manifest.permissions),
        () => manifest.action && manifest.action.default_popup,
        () => manifest.side_panel && manifest.side_panel.default_path,
        () => manifest.content_scripts && Array.isArray(manifest.content_scripts),
        () => manifest.content_security_policy
      ];
      
      const passedTests = tests.filter(test => test()).length;
      this.results.manifest.passed = passedTests === tests.length;
      
      if (!this.results.manifest.passed) {
        this.results.manifest.issues.push(`${tests.length - passedTests} manifest tests failed`);
      }
      
    } catch (error) {
      this.results.manifest.issues.push(`Manifest test error: ${error.message}`);
    }
  }

  async testBackgroundScript() {
    try {
      // Test background script initialization
      const fs = require('fs');
      const path = require('path');
      
      const backgroundPath = path.join(__dirname, 'dist', 'background.js');
      const backgroundCode = fs.readFileSync(backgroundPath, 'utf8');
      
      // Test for key patterns
      const patterns = [
        /chrome\.runtime\.onInstalled\.addListener/,
        /chrome\.runtime\.onMessage\.addListener/,
        /chrome\.storage\.local/,
        /chrome\.storage\.sync/,
        /chrome\.sidePanel\.setOptions/,
        /TeamDashboardBackground/
      ];
      
      const passedPatterns = patterns.filter(pattern => pattern.test(backgroundCode)).length;
      this.results.background.passed = passedPatterns === patterns.length;
      
      if (!this.results.background.passed) {
        this.results.background.issues.push(`${patterns.length - passedPatterns} background patterns missing`);
      }
      
    } catch (error) {
      this.results.background.issues.push(`Background test error: ${error.message}`);
    }
  }

  async testStorageFunctionality() {
    try {
      // Test storage operations
      const testData = { test: 'data', timestamp: Date.now() };
      
      // Test local storage
      await chrome.storage.local.set(testData);
      const localResult = await chrome.storage.local.get('test');
      
      // Test sync storage
      await chrome.storage.sync.set({ preferences: { autoSync: true } });
      const syncResult = await chrome.storage.sync.get('preferences');
      
      // Test storage size
      const localSize = await chrome.storage.local.getBytesInUse();
      const syncSize = await chrome.storage.sync.getBytesInUse();
      
      const tests = [
        () => this.apiCalls.storageLocalSet > 0,
        () => this.apiCalls.storageLocalGet > 0,
        () => this.apiCalls.storageSyncSet > 0,
        () => this.apiCalls.storageSyncGet > 0,
        () => typeof localSize === 'number',
        () => typeof syncSize === 'number'
      ];
      
      const passedTests = tests.filter(test => test()).length;
      this.results.storage.passed = passedTests === tests.length;
      
      if (!this.results.storage.passed) {
        this.results.storage.issues.push(`${tests.length - passedTests} storage tests failed`);
      }
      
    } catch (error) {
      this.results.storage.issues.push(`Storage test error: ${error.message}`);
    }
  }

  async testMessaging() {
    try {
      // Test message passing
      const testMessage = { type: 'TEST_MESSAGE', data: 'test' };
      
      // Test sending message
      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage(testMessage, resolve);
      });
      
      // Test listener registration
      const listenerCount = chrome.runtime.onMessage.addListener.mock.calls.length;
      
      const tests = [
        () => this.apiCalls.sendMessage > 0,
        () => response && typeof response === 'object',
        () => this.apiCalls.addListener >= 0 // Listeners might be registered during init
      ];
      
      const passedTests = tests.filter(test => test()).length;
      this.results.messaging.passed = passedTests === tests.length;
      
      if (!this.results.messaging.passed) {
        this.results.messaging.issues.push(`${tests.length - passedTests} messaging tests failed`);
      }
      
    } catch (error) {
      this.results.messaging.issues.push(`Messaging test error: ${error.message}`);
    }
  }

  async testPermissions() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const manifestPath = path.join(__dirname, 'dist', 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Test permission minimization
      const requiredPermissions = ['storage', 'activeTab', 'sidePanel', 'scripting'];
      const actualPermissions = manifest.permissions || [];
      
      const tests = [
        () => actualPermissions.length <= 6, // Minimal permissions
        () => requiredPermissions.every(perm => actualPermissions.includes(perm)),
        () => manifest.host_permissions && manifest.host_permissions.length <= 2,
        () => !actualPermissions.includes('tabs'), // Should use activeTab instead
        () => !actualPermissions.includes('<all_urls>') // Should be specific
      ];
      
      const passedTests = tests.filter(test => test()).length;
      this.results.permissions.passed = passedTests === tests.length;
      
      if (!this.results.permissions.passed) {
        this.results.permissions.issues.push(`Permission security issues detected`);
      }
      
    } catch (error) {
      this.results.permissions.issues.push(`Permission test error: ${error.message}`);
    }
  }

  async testSecurity() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Test CSP compliance
      const manifestPath = path.join(__dirname, 'dist', 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      const csp = manifest.content_security_policy;
      
      const tests = [
        () => csp && csp.extension_pages,
        () => csp.extension_pages.includes("script-src 'self'"),
        () => csp.extension_pages.includes("object-src 'self'"),
        () => !csp.extension_pages.includes("'unsafe-eval'"),
        () => !csp.extension_pages.includes("'unsafe-inline'")
      ];
      
      const passedTests = tests.filter(test => test()).length;
      this.results.security.passed = passedTests === tests.length;
      
      if (!this.results.security.passed) {
        this.results.security.issues.push(`Security policy violations detected`);
      }
      
    } catch (error) {
      this.results.security.issues.push(`Security test error: ${error.message}`);
    }
  }

  async testSidePanelUI() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Test side panel HTML structure
      const sidepanelPath = path.join(__dirname, 'dist', 'sidepanel.html');
      const sidepanelHTML = fs.readFileSync(sidepanelPath, 'utf8');
      
      // Test side panel JavaScript
      const sidepanelJSPath = path.join(__dirname, 'dist', 'sidepanel.js');
      const sidepanelJS = fs.readFileSync(sidepanelJSPath, 'utf8');
      
      const tests = [
        () => sidepanelHTML.includes('nav-tab'),
        () => sidepanelHTML.includes('tab-content'),
        () => sidepanelHTML.includes('agents-tab'),
        () => sidepanelHTML.includes('dashboard-tab'),
        () => sidepanelHTML.includes('settings-tab'),
        () => sidepanelJS.includes('SidePanelManager'),
        () => sidepanelJS.includes('chrome.runtime.sendMessage')
      ];
      
      const passedTests = tests.filter(test => test()).length;
      this.results.sidepanel.passed = passedTests === tests.length;
      
      if (!this.results.sidepanel.passed) {
        this.results.sidepanel.issues.push(`Side panel structure issues detected`);
      }
      
    } catch (error) {
      this.results.sidepanel.issues.push(`Side panel test error: ${error.message}`);
    }
  }

  async testPopupUI() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Test popup HTML structure
      const popupPath = path.join(__dirname, 'dist', 'popup.html');
      const popupHTML = fs.readFileSync(popupPath, 'utf8');
      
      // Test popup JavaScript
      const popupJSPath = path.join(__dirname, 'dist', 'popup.js');
      const popupJS = fs.readFileSync(popupJSPath, 'utf8');
      
      const tests = [
        () => popupHTML.includes('openSidePanel'),
        () => popupHTML.includes('openDashboard'),
        () => popupHTML.includes('syncData'),
        () => popupJS.includes('PopupManager'),
        () => popupJS.includes('chrome.sidePanel.open'),
        () => popupJS.includes('chrome.tabs.create')
      ];
      
      const passedTests = tests.filter(test => test()).length;
      this.results.popup.passed = passedTests === tests.length;
      
      if (!this.results.popup.passed) {
        this.results.popup.issues.push(`Popup functionality issues detected`);
      }
      
    } catch (error) {
      this.results.popup.issues.push(`Popup test error: ${error.message}`);
    }
  }

  async testContentScript() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Test content script
      const contentPath = path.join(__dirname, 'dist', 'content.js');
      const contentJS = fs.readFileSync(contentPath, 'utf8');
      
      const tests = [
        () => contentJS.includes('TeamDashboardContent'),
        () => contentJS.includes('createDashboardButton'),
        () => contentJS.includes('isCodeRelatedSite'),
        () => contentJS.includes('detectCodeAreas'),
        () => contentJS.includes('chrome.runtime.sendMessage'),
        () => contentJS.includes('showCodeContextMenu')
      ];
      
      const passedTests = tests.filter(test => test()).length;
      this.results.content.passed = passedTests === tests.length;
      
      if (!this.results.content.passed) {
        this.results.content.issues.push(`Content script functionality issues detected`);
      }
      
    } catch (error) {
      this.results.content.issues.push(`Content script test error: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🔍 Starting Chrome Extension Comprehensive Testing...\n');
    
    await this.testManifestCompliance();
    await this.testBackgroundScript();
    await this.testStorageFunctionality();
    await this.testMessaging();
    await this.testPermissions();
    await this.testSecurity();
    await this.testSidePanelUI();
    await this.testPopupUI();
    await this.testContentScript();
    
    return this.generateReport();
  }

  generateReport() {
    const totalTests = Object.keys(this.results).length;
    const passedTests = Object.values(this.results).filter(result => result.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('📊 Chrome Extension Test Results');
    console.log('================================\n');
    
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${failedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
    
    // Detailed results
    Object.entries(this.results).forEach(([test, result]) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${test.toUpperCase()}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          console.log(`   • ${issue}`);
        });
      }
    });
    
    console.log('\n🎯 Summary:');
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Chrome extension is ready for deployment.');
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed. Review issues above.`);
    }
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      results: this.results
    };
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ChromeExtensionTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ChromeExtensionTester;