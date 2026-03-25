import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  sumsub: {
    appToken: process.env.SUMSUB_APP_TOKEN || '',
    secretKey: process.env.SUMSUB_SECRET_KEY || '',
    baseUrl: process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com',
    levelName: process.env.SUMSUB_LEVEL_NAME || 'id-and-liveness',
    webhookSecret: process.env.SUMSUB_WEBHOOK_SECRET || '',
  },
  aleo: {
    issuerPrivateKey: process.env.ALEO_ISSUER_PRIVATE_KEY || '',
    programId: process.env.ALEO_PROGRAM_ID || 'zkaccess_v3.aleo',
    apiEndpoint: process.env.ALEO_API_ENDPOINT || 'https://api.explorer.provable.com/v1',
    network: process.env.ALEO_NETWORK || 'testnet',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
} as const
