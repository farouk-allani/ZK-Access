export interface VerificationData {
  age: number
  countryCode: number
  kycPassed: boolean
  accreditedInvestor: boolean
}

export interface VerificationRecord {
  walletAddress: string
  fractalUserId?: string
  accessToken?: string
  status: 'pending' | 'verified' | 'failed' | 'credential_issued'
  verificationData?: VerificationData
  credentialTxId?: string
  createdAt: Date
  updatedAt: Date
}

class VerificationStore {
  private records = new Map<string, VerificationRecord>()

  create(walletAddress: string): VerificationRecord {
    const record: VerificationRecord = {
      walletAddress,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.records.set(walletAddress, record)
    return record
  }

  get(walletAddress: string): VerificationRecord | undefined {
    return this.records.get(walletAddress)
  }

  update(walletAddress: string, data: Partial<VerificationRecord>): VerificationRecord | undefined {
    const record = this.records.get(walletAddress)
    if (!record) return undefined
    Object.assign(record, data, { updatedAt: new Date() })
    return record
  }

  getByFractalId(fractalUserId: string): VerificationRecord | undefined {
    for (const record of this.records.values()) {
      if (record.fractalUserId === fractalUserId) return record
    }
    return undefined
  }

  getAll(): VerificationRecord[] {
    return Array.from(this.records.values())
  }
}

export const store = new VerificationStore()
