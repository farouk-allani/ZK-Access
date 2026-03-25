import crypto from 'crypto'
import { config } from '../config.js'
import type { VerificationData } from '../store.js'

// ISO 3166-1 alpha-3 → numeric code mapping
const COUNTRY_CODES: Record<string, number> = {
  USA: 840, GBR: 826, DEU: 276, FRA: 250, JPN: 392,
  KOR: 410, SGP: 702, CHE: 756, CAN: 124, AUS: 36,
  BRA: 76, IND: 356, ARE: 784, HKG: 344, NLD: 528,
  SWE: 752, NOR: 578, DNK: 208, FIN: 246, ESP: 724,
  ITA: 380, PRT: 620, AUT: 40, BEL: 56, IRL: 372,
  NZL: 554, MEX: 484, ARG: 32, CHL: 152, COL: 170,
  ZAF: 710, NGA: 566, KEN: 404, EGY: 818, ISR: 376,
  TWN: 158, THA: 764, VNM: 704, PHL: 608, MYS: 458,
  IDN: 360, PAK: 586, BGD: 50, LKA: 144,
  TUN: 788, TUR: 792, UKR: 804, POL: 616, ROU: 642, HUN: 348,
  // Restricted
  PRK: 408, IRN: 364, SYR: 760, CUB: 192,
}

function generateSignature(ts: number, method: string, path: string, body: string = ''): string {
  const data = `${ts}${method.toUpperCase()}${path}${body}`
  return crypto
    .createHmac('sha256', config.sumsub.secretKey)
    .update(data)
    .digest('hex')
}

async function sumsubRequest(method: string, path: string, body?: object): Promise<Response> {
  const ts = Math.floor(Date.now() / 1000)
  const bodyStr = body ? JSON.stringify(body) : ''
  const signature = generateSignature(ts, method, path, bodyStr)

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-App-Token': config.sumsub.appToken,
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': ts.toString(),
  }
  if (body) headers['Content-Type'] = 'application/json'

  return fetch(`${config.sumsub.baseUrl}${path}`, {
    method,
    headers,
    body: body ? bodyStr : undefined,
  })
}

export class SumsubService {

  /**
   * List available verification levels in the Sumsub account.
   */
  async listLevels(): Promise<unknown> {
    const path = '/resources/applicants/levels'
    const res = await sumsubRequest('GET', path)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Sumsub list levels failed (${res.status}): ${text}`)
    }
    return res.json()
  }

  /**
   * Generate an access token for the Sumsub WebSDK.
   * The frontend embeds the SDK widget using this token.
   */
  async generateAccessToken(externalUserId: string): Promise<{ token: string; userId: string }> {
    const levelParam = config.sumsub.levelName ? `&levelName=${encodeURIComponent(config.sumsub.levelName)}` : ''
    const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}${levelParam}`
    const res = await sumsubRequest('POST', path)

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Sumsub access token failed (${res.status}): ${text}`)
    }

    const data = await res.json() as { token: string; userId: string }
    return data
  }

  /**
   * Fetch applicant verification status from Sumsub.
   */
  async getApplicantStatus(applicantId: string): Promise<SumsubApplicantStatus> {
    const path = `/resources/applicants/${applicantId}/requiredIdDocsStatus`
    const res = await sumsubRequest('GET', path)

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Sumsub status check failed (${res.status}): ${text}`)
    }

    return res.json() as Promise<SumsubApplicantStatus>
  }

  /**
   * Fetch applicant data (personal info extracted from documents).
   * Tries by Sumsub internal ID first, then by external user ID (wallet address).
   */
  async getApplicantData(applicantId: string): Promise<SumsubApplicantData> {
    // Try direct lookup by Sumsub internal ID
    const path = `/resources/applicants/${applicantId}/one`
    const res = await sumsubRequest('GET', path)

    if (res.ok) {
      return res.json() as Promise<SumsubApplicantData>
    }

    // Fallback: lookup by external user ID (wallet address)
    const extPath = `/resources/applicants/-;externalUserId=${encodeURIComponent(applicantId)}/one`
    const extRes = await sumsubRequest('GET', extPath)

    if (!extRes.ok) {
      const text = await extRes.text()
      throw new Error(`Sumsub applicant data failed (${extRes.status}): ${text}`)
    }

    return extRes.json() as Promise<SumsubApplicantData>
  }

  /**
   * Extract verification data from Sumsub applicant info.
   */
  extractVerificationData(applicant: SumsubApplicantData, reviewStatus: string): VerificationData {
    const info = applicant.info || {}
    const dob = info.dob
    const age = dob ? this.calculateAge(dob) : 0

    const country = info.country || info.nationality || ''
    const countryCode = COUNTRY_CODES[country.toUpperCase()] || 0

    return {
      age,
      countryCode,
      kycPassed: reviewStatus === 'completed',
      accreditedInvestor: false,
    }
  }

  /**
   * Verify webhook signature from Sumsub.
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!config.sumsub.webhookSecret) return true // skip if not configured
    const expected = crypto
      .createHmac('sha256', config.sumsub.webhookSecret)
      .update(body)
      .digest('hex')
    return expected === signature
  }

  private calculateAge(dob: string): number {
    const date = new Date(dob)
    if (isNaN(date.getTime())) return 0
    const now = new Date()
    let age = now.getFullYear() - date.getFullYear()
    const monthDiff = now.getMonth() - date.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
      age--
    }
    return Math.max(0, age)
  }
}

interface SumsubApplicantStatus {
  [docType: string]: {
    reviewResult?: { reviewAnswer: string }
  }
}

interface SumsubApplicantData {
  id: string
  externalUserId?: string
  reviewStatus?: string
  review?: {
    reviewStatus?: string
    reviewResult?: {
      reviewAnswer: string
    }
  }
  reviewResult?: {
    reviewAnswer: string // 'GREEN' | 'RED' | 'RETRY'
  }
  info?: {
    dob?: string
    country?: string
    nationality?: string
    firstName?: string
    lastName?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}
