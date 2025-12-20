# Bluesky Plugin for SocialGata

A SocialGata plugin that provides access to Bluesky feeds, posts, comments, and user profiles.

## Features

- Browse your timeline (authenticated) or "What's Hot" feed (unauthenticated)
- Search posts across Bluesky
- View user profiles and their posts
- Read post threads with nested replies
- Optional authentication for personalized timeline

## Installation

### From URL (Recommended)

Install the plugin in SocialGata by providing the manifest URL:
```
https://cdn.jsdelivr.net/gh/InfoGata/bluesky-socialgata@latest/manifest.json
```

### Manual Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. In SocialGata, add the plugin from the `dist/` folder

## Configuration (Optional)

For authenticated access to your personalized timeline:

1. Go to your Bluesky account settings
2. Create an App Password (Settings > App Passwords)
3. Open the plugin options in SocialGata
4. Enter your Bluesky handle/email and app password

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

This runs two builds:
- `npm run build:options` - Builds the options UI page
- `npm run build:plugin` - Builds the main plugin script

### Output

- `dist/index.js` - Main plugin script
- `dist/options.html` - Options/settings page

## Plugin API Methods

| Method | Description |
|--------|-------------|
| `onGetFeed` | Get timeline (authenticated) or "What's Hot" feed |
| `onGetComments` | Get thread replies for a post |
| `onGetUser` | Get a user's profile and posts |
| `onSearch` | Search Bluesky posts |
| `onLogin` | Authenticate with handle and app password |
| `onLogout` | Clear authentication |
| `onIsLoggedIn` | Check login status |
| `onGetPlatformType` | Returns "microblog" |

## License

MIT
