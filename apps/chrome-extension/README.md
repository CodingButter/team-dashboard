# Team Dashboard Chrome Extension

A Chrome extension that provides seamless integration with the Team Dashboard autonomous coding agents platform.

## Features

### ✅ Manifest V3 Compliant
- Modern service worker-based background script
- Proper permission management
- Content Security Policy compliance
- Future-proof architecture

### ✅ Advanced Storage Management
- Efficient chrome.storage.local for large data sets
- chrome.storage.sync for user preferences with conflict resolution
- Automatic data migration during extension updates
- Storage quota monitoring and management

### ✅ Side Panel Integration
- Modern side panel API implementation
- Real-time agent status monitoring
- Team dashboard overview
- Quick actions and settings

### ✅ Cross-Origin Permissions
- Secure communication with Team Dashboard API
- Configurable endpoint support
- Proper CORS handling
- Authentication token management

### ✅ Error Handling & Recovery
- Comprehensive error logging
- Graceful degradation on connection failures
- Automatic retry mechanisms
- User-friendly error reporting

## Installation

### For Development

1. **Build the extension:**
   ```bash
   cd apps/chrome-extension
   npm install
   npm run build
   ```

2. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### For Production

1. **Build production version:**
   ```bash
   npm run build
   npm run zip
   ```

2. **Submit to Chrome Web Store:**
   - Upload `team-dashboard-extension.zip`
   - Follow Chrome Web Store guidelines

## Configuration

### Dashboard Connection

The extension can be configured to connect to different Team Dashboard instances:

- **Development:** `http://localhost:3000` (default)
- **Production:** `https://your-domain.com`

Update the connection URL in the extension settings.

### Permissions

The extension requests minimal permissions:

- `storage` - For storing team data and user preferences
- `activeTab` - For side panel integration
- `sidePanel` - For side panel functionality
- `scripting` - For content script injection

### Host Permissions

- `http://localhost:3000/*` - Development server
- `https://*.team-dashboard.com/*` - Production domains

## Architecture

### Service Worker (background.js)

Handles:
- Extension lifecycle management
- Storage operations with conflict resolution
- API communication with Team Dashboard
- Error handling and logging
- Periodic data synchronization

### Side Panel (sidepanel.html/js)

Provides:
- Agent status monitoring
- Team overview dashboard
- Settings management
- Data synchronization controls

### Content Script (content.js)

Features:
- Code detection and context menus
- Integration with code-related websites
- Page context extraction
- Quick access button

### Popup (popup.html/js)

Simple interface for:
- Opening side panel
- Quick dashboard access
- Connection status
- Data synchronization

## Storage Architecture

### chrome.storage.local
Used for larger datasets:
- `teamData` - Team member information and status
- `agentConfigs` - Agent configurations and settings
- `dashboardState` - Connection and sync status
- `errorLog` - Error tracking for debugging

### chrome.storage.sync
Used for user preferences (synced across devices):
- `userPreferences` - User settings and preferences

### Conflict Resolution

The extension implements smart conflict resolution for storage sync:
- Merges user preferences intelligently
- Handles concurrent updates gracefully
- Maintains data consistency across devices

## API Integration

### Team Dashboard Endpoints

- `GET /api/sync` - Retrieve team data
- `POST /api/sync` - Update team data  
- `GET /api/agents/status` - Get agent status
- `POST /api/agents/action` - Send agent commands

### Error Handling

- Network failures: Automatic retry with exponential backoff
- API errors: User-friendly error messages
- Storage failures: Graceful degradation
- Permission errors: Clear guidance for resolution

## Development

### File Structure

```
apps/chrome-extension/
├── manifest.json          # Extension manifest (V3)
├── background.js          # Service worker
├── sidepanel.html/js      # Side panel interface
├── popup.html/js          # Extension popup
├── content.js             # Content script
├── styles/
│   └── sidepanel.css      # Side panel styles
├── package.json           # Dependencies and scripts
├── webpack.config.js      # Build configuration
└── README.md              # This file
```

### Build Scripts

- `npm run dev` - Development build with watching
- `npm run build` - Production build
- `npm run test` - Run tests
- `npm run lint` - Code linting
- `npm run clean` - Clean build directory
- `npm run zip` - Create distribution package

### Testing

Run the test suite:
```bash
npm test
```

Test coverage includes:
- Storage operations
- API communication
- Error handling
- UI interactions

## Security

### Content Security Policy

The extension follows strict CSP guidelines:
- No inline scripts or styles
- External resources properly declared
- Secure communication channels only

### Permission Minimization

Only essential permissions are requested:
- No unnecessary host permissions
- Minimal scope for required features
- Clear permission explanations

### Data Protection

- No sensitive data stored in sync storage
- Local data encrypted where appropriate
- Secure API communication (HTTPS only)
- User data privacy maintained

## Troubleshooting

### Common Issues

**Extension not loading:**
- Check if Manifest V3 is supported
- Verify all files are in dist/ folder
- Check console for syntax errors

**Connection failures:**
- Verify Team Dashboard is running
- Check network connectivity
- Review host permissions

**Storage issues:**
- Check quota limits
- Verify storage permissions
- Review error logs in extension

### Debug Mode

Enable debug logging by:
1. Opening Chrome DevTools
2. Go to Extensions tab
3. Click on extension service worker
4. Check console for detailed logs

## Browser Compatibility

- **Chrome 88+** (Manifest V3 support)
- **Edge 88+** (Chromium-based)
- **Opera 74+** (Chromium-based)

## Performance

### Metrics

- **Memory usage:** < 10MB typical
- **Storage usage:** < 5MB for team data
- **CPU impact:** Minimal (< 1% background)
- **Network usage:** Optimized API calls

### Optimization

- Efficient data structures
- Lazy loading of components
- Minimal background processing
- Smart caching strategies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style

- ESLint configuration provided
- Prettier for code formatting
- JSDoc comments for functions
- Consistent naming conventions

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests:
- GitHub Issues: [team-dashboard/issues](https://github.com/team-dashboard/issues)
- Documentation: [docs.team-dashboard.com](https://docs.team-dashboard.com)
- Discord: [Team Dashboard Community](https://discord.gg/team-dashboard)