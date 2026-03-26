export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface TxRecord {
  id: string
  functionName: string
  timestamp: number
  status: 'submitted' | 'confirmed' | 'failed'
  explorerId?: string
}

export type ProofType = 'age' | 'kyc' | 'country' | 'accredited' | 'gate'

export interface GateConfig {
  gateId: string
  minAge: number
  requireKyc: boolean
  requireNotRestricted: boolean
  requireAccredited: boolean
  active: boolean
  owner?: string
}

export interface ParsedCredential {
  raw: Record<string, unknown>
  owner: string
  issuer: string
  credentialId: string
  age: number
  countryCode: number
  kycPassed: boolean
  accreditedInvestor: boolean
  issuedAt: number
  expiresAt: number
}

export interface AccessTokenParsed {
  gateId: string
  claimType: number
  passed: boolean
  proofHeight: number
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
  788: 'Tunisia',
  818: 'Egypt',
  12: 'Algeria',
  504: 'Morocco',
  566: 'Nigeria',
  710: 'South Africa',
  702: 'Singapore',
  458: 'Malaysia',
  764: 'Thailand',
  528: 'Netherlands',
  724: 'Spain',
  380: 'Italy',
  616: 'Poland',
  620: 'Portugal',
  // Restricted
  408: 'North Korea',
  364: 'Iran',
  760: 'Syria',
  192: 'Cuba',
}

export const RESTRICTED_COUNTRIES = [408, 364, 760, 192]

export const VALIDITY_OPTIONS = [
  { label: '30 days (~43,200 blocks)', value: 43200 },
  { label: '90 days (~129,600 blocks)', value: 129600 },
  { label: '1 year (~525,600 blocks)', value: 525600 },
]
