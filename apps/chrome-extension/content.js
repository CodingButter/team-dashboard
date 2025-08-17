// Content Script for Team Dashboard Chrome Extension
// Runs on all web pages to provide context and integration

class TeamDashboardContent {
  constructor() {
    this.isInitialized = false;
    this.dashboardButton = null;
    this.initialize();
  }

  initialize() {
    if (this.isInitialized) return;
    
    // Wait for page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    try {
      this.createDashboardButton();
      this.setupMessageListener();
      this.detectCodeAreas();
      this.isInitialized = true;
      
      console.log('Team Dashboard content script initialized');
    } catch (error) {
      console.error('Content script setup failed:', error);
    }
  }

  createDashboardButton() {
    // Only create button on code-related sites
    if (!this.isCodeRelatedSite()) {
      return;
    }

    // Create floating dashboard button
    this.dashboardButton = document.createElement('div');
    this.dashboardButton.id = 'team-dashboard-button';
    this.dashboardButton.innerHTML = '🤖';
    this.dashboardButton.title = 'Open Team Dashboard';
    
    // Style the button
    Object.assign(this.dashboardButton.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '48px',
      height: '48px',
      backgroundColor: '#3b82f6',
      color: 'white',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: '10000',
      transition: 'all 0.3s ease',
      userSelect: 'none'
    });

    // Add hover effects
    this.dashboardButton.addEventListener('mouseenter', () => {
      this.dashboardButton.style.transform = 'scale(1.1)';
      this.dashboardButton.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
    });

    this.dashboardButton.addEventListener('mouseleave', () => {
      this.dashboardButton.style.transform = 'scale(1)';
      this.dashboardButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    // Add click handler
    this.dashboardButton.addEventListener('click', () => {
      this.openDashboard();
    });

    // Add to page
    document.body.appendChild(this.dashboardButton);
  }

  isCodeRelatedSite() {
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    
    // List of code-related sites
    const codeSites = [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'stackoverflow.com',
      'codepen.io',
      'jsfiddle.net',
      'repl.it',
      'codesandbox.io',
      'glitch.com',
      'localhost'
    ];

    // Check if current site is code-related
    const isCodeSite = codeSites.some(site => hostname.includes(site));
    
    // Check if page contains code-related content
    const hasCodeContent = this.hasCodeContent();
    
    return isCodeSite || hasCodeContent;
  }

  hasCodeContent() {
    // Check for common code-related elements
    const codeSelectors = [
      'pre', 'code', '.highlight', '.code', '.source',
      '[class*="code"]', '[class*="syntax"]', '[class*="highlight"]'
    ];

    return codeSelectors.some(selector => {
      const elements = document.querySelectorAll(selector);
      return elements.length > 0;
    });
  }

  detectCodeAreas() {
    // Find and annotate code areas for potential agent interaction
    const codeElements = document.querySelectorAll('pre, code, .highlight');
    
    codeElements.forEach((element, index) => {
      if (element.textContent.length > 50) { // Only consider substantial code blocks
        element.dataset.teamDashboardCode = index;
        element.style.position = 'relative';
        
        // Add context menu for code blocks
        element.addEventListener('contextmenu', (e) => {
          this.showCodeContextMenu(e, element);
        });
      }
    });
  }

  showCodeContextMenu(event, codeElement) {
    event.preventDefault();
    
    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'team-dashboard-context-menu';
    menu.innerHTML = `
      <div class="menu-item" data-action="analyze">🔍 Analyze Code</div>
      <div class="menu-item" data-action="optimize">⚡ Optimize</div>
      <div class="menu-item" data-action="explain">📝 Explain</div>
      <div class="menu-item" data-action="test">🧪 Generate Tests</div>
    `;
    
    // Style the menu
    Object.assign(menu.style, {
      position: 'fixed',
      top: event.clientY + 'px',
      left: event.clientX + 'px',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      zIndex: '10001',
      minWidth: '150px',
      overflow: 'hidden'
    });

    // Style menu items
    const menuItems = menu.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      Object.assign(item.style, {
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: '14px',
        borderBottom: '1px solid #f3f4f6'
      });

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f9fafb';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });

      item.addEventListener('click', () => {
        this.handleCodeAction(item.dataset.action, codeElement);
        menu.remove();
      });
    });

    // Add to page
    document.body.appendChild(menu);

    // Remove menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', () => {
        if (menu.parentNode) {
          menu.remove();
        }
      }, { once: true });
    }, 100);
  }

  handleCodeAction(action, codeElement) {
    const code = codeElement.textContent;
    
    // Send code to background script for processing
    chrome.runtime.sendMessage({
      type: 'CODE_ACTION',
      action,
      code,
      url: window.location.href,
      context: this.getPageContext()
    });

    // Show notification
    this.showNotification(`${action} request sent to Team Dashboard`);
  }

  getPageContext() {
    return {
      title: document.title,
      url: window.location.href,
      hostname: window.location.hostname,
      language: this.detectLanguage()
    };
  }

  detectLanguage() {
    // Simple language detection based on file extension or page content
    const pathname = window.location.pathname;
    const extension = pathname.split('.').pop();
    
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'rb': 'ruby',
      'php': 'php',
      'go': 'go',
      'rs': 'rust'
    };

    return languageMap[extension] || 'unknown';
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'HIGHLIGHT_CODE':
          this.highlightCode(message.selector);
          break;
        case 'GET_PAGE_INFO':
          sendResponse(this.getPageContext());
          break;
        case 'SHOW_NOTIFICATION':
          this.showNotification(message.text);
          break;
      }
    });
  }

  highlightCode(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.style.outline = '2px solid #3b82f6';
      element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        element.style.outline = '';
        element.style.backgroundColor = '';
      }, 3000);
    }
  }

  showNotification(text) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = text;
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: '10002',
      fontSize: '14px',
      maxWidth: '400px',
      textAlign: 'center'
    });

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  async openDashboard() {
    try {
      // Try to open side panel first
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', tabId: tab.id });
    } catch (error) {
      // Fallback to opening dashboard in new tab
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    }
  }
}

// Initialize content script
if (typeof window !== 'undefined' && !window.teamDashboardContent) {
  window.teamDashboardContent = new TeamDashboardContent();
}