export interface Credential {
  id: string
  owner: string
  issuer: string
  age: number
  countryCode: number
  kycPassed: boolean
  accreditedInvestor: boolean
  riskScore: number
  issuedAt: number
  expiresAt: number
}

export interface Proof {
  id: string
  credentialId: string
  proofType: ProofType
  result: boolean
  params: Record<string, unknown>
  generatedAt: number
  nonce: string
  owner: string
}

export type ProofType = 'age' | 'kyc' | 'country' | 'accredited' | 'composite'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export const COUNTRY_NAMES: Record<number, string> = {
  840: 'United States',
  826: 'United Kingdom',
  276: 'Germany',
  250: 'France',
  392: 'Japan',
  410: 'South Korea',
  756: 'Switzerland',
  124: 'Canada',
  36: 'Australia',
  356: 'India',
  76: 'Brazil',
  484: 'Mexico',
  // Restricted
  408: 'North Korea',
  364: 'Iran',
  760: 'Syria',
  192: 'Cuba',
}

export const RESTRICTED_COUNTRIES = [408, 364, 760, 192]
