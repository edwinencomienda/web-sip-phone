# Web SIP Phone

A modern web-based SIP (Session Initiation Protocol) phone application built with React, TypeScript, Vite, and shadcn/ui. Make and receive calls directly from your browser.

## Features

- **Multiple SIP Accounts**: Configure and manage multiple SIP accounts
- **Make & Receive Calls**: Full calling functionality with audio support
- **Call History**: Persistent call history with timestamps and duration tracking (last 10 calls per account)
- **DTMF Dial Pad**: Send tone digits during active calls for IVR navigation with authentic phone sounds
- **Call Duration Timer**: Real-time call duration display (MM:SS format)
- **Mute Control**: Mute/unmute audio during calls
- **Incoming Call Notifications**: Beautiful popup dialogs for incoming calls
- **Quick Dial from History**: Click any history entry to quickly redial with confirmation
- **LocalStorage Persistence**: Call history automatically saved to browser storage
- **Clean UI**: Responsive design using shadcn/ui components and Tailwind CSS

## Technology Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **SIP Library**: JsSIP
- **Audio**: Web Audio API (DTMF tone generation)

## Getting Started

### Prerequisites

- Node.js (v16+)
- pnpm (or npm/yarn)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Building for Production

```bash
pnpm build
```

The production-ready files will be in the `dist/` directory.

## Usage

### Configuring SIP Accounts

1. Click the settings icon (gear) in the application
2. Enter your SIP account details:
   - **Account Name**: Display name for the account
   - **Username**: Your SIP username
   - **Password**: Your SIP password
   - **Domain**: Your SIP server domain
   - **WebSocket Server**: Your SIP server's WebSocket URL (e.g., `wss://sip.example.com:8443`)

3. Click "Save" to register with the SIP server

### Making a Call

1. Ensure an account is selected and registered
2. Enter the phone number or SIP URI in the dial field
3. Click the "Call" button
4. During the call:
   - Use the **mute button** to toggle audio
   - Use the **dial pad** to send DTMF tones
   - Click **End Call** to disconnect

### Receiving a Call

- An incoming call will trigger a popup notification
- Click **Answer** to accept or **Decline** to reject
- Once connected, the same call controls are available

### Call History

- View up to 10 recent calls per account
- Incoming calls show with a ↓ indicator, outgoing with ↑
- Click any history entry to quickly redial
- A confirmation dialog will appear before calling

## Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── sip-phone.tsx       # Main SIP phone component
│   └── settings.tsx        # Account settings component
├── lib/
│   ├── sip-service.ts      # JsSIP service wrapper
│   └── dtmf-audio.ts       # DTMF tone generation
├── App.tsx                 # Main application
└── main.tsx               # Entry point
```

## Development

### Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint

### Code Style

- TypeScript with strict mode enabled
- ESLint for code quality
- Tailwind CSS for styling
- Functional components with React hooks

## Browser Compatibility

- Chrome/Edge 80+
- Firefox 75+
- Safari 14+
- Requires WebSocket and Web Audio API support

## Notes

- Call history is stored in browser's localStorage per SIP account
- Audio is required for both incoming and outgoing calls
- Browser microphone permissions must be granted
- DTMF tones are played locally while being sent to the remote party

## License

MIT
