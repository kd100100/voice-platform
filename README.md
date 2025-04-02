# Piramal Voice Platform

A voice calling platform that enables AI-powered phone conversations using Twilio.

## Quick Setup

1. Configure environment variables:
   - Copy `webapp/.env.example` to `webapp/.env` and update with your credentials
   - Copy `websocket-server/.env.example` to `websocket-server/.env` and update with your credentials

2. Open three terminal windows:

| Terminal | Purpose                       | Command                |
| -------- | ----------------------------- | ---------------------- |
| 1        | To run the `webapp`           | `cd webapp && npm run dev` |
| 2        | To run the `websocket-server` | `cd websocket-server && npm run dev` |
| 3        | To run `ngrok`                | `ngrok http 8081`      |

3. Set the Twilio webhook to your ngrok URL

## How It Works

This application consists of two main components:

1. `webapp`: Next.js frontend for call configuration and transcripts
2. `websocket-server`: Express backend that handles connections from Twilio and manages voice interactions

The platform uses Twilio for telephony services and connects to AI services for natural language processing.

## Requirements

- Node.js 18+
- npm
- Twilio account with a phone number
- ngrok account (for local development)
