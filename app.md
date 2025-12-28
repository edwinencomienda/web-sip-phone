# Web SIP Phone App

A simple web phone SIP using JSSIP library.

## Features

- Multi-account support with sidebar navigation
- Add, edit, and delete SIP accounts
- Account settings saved to local storage
- Make and receive SIP calls
- Call controls (mute, end call)
- Real-time registration and call status

## Tech Stack

- Frontend: React, shadcn UI
- JSSIP for SIP communication

## Architecture

- **App.tsx**: Main container with multi-account state management
- **AccountSidebar**: Account selection and management sidebar
- **SipPhone**: Active phone dialer/receiver for selected account
- **SipAccountSettings**: Form to add/edit SIP account credentials
- **sip-service.ts**: Low-level SIP protocol handling via JSSIP
