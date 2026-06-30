import { api } from '../auth'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface UserProfile {
  profileId: string
  displayName: string
  avatarUrl: string
  isKidsMode: boolean
}

export interface AdminUser {
  userId: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string
  deactivatedAt: string
  deactivationReason: string
  profiles?: UserProfile[]
}

export interface GetUsersResponse {
  users: AdminUser[]
  total: number
}

// ─────────────────────────────────────────────
// AUDIT EVENTS
// ─────────────────────────────────────────────

export interface AuditEvent {
  logId: string
  userId: string
  eventType: string
  description: string
  metadata: string
  createdAt: string
}

export interface GetAuditEventsResponse {
  logs: AuditEvent[]
  totalRecords: number
  page: number
  pageSize: number
}

// ─────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────

export const userAdminAPI = {
  // ✅ GET USERS (tabla principal)
  getAllUsers: async () => {
    const res = await api.get('/auth/admin/users')
    return res.data as GetUsersResponse
  },

  // ✅ GET AUDIT EVENTS (cron, desactivaciones, etc)
  getAuditEvents: async (params?: {
    page?: number
    pageSize?: number
    eventType?: string
  }) => {
    const res = await api.get('/auth/admin/audit-events', {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
        eventType: params?.eventType,
      },
    })

    return res.data as GetAuditEventsResponse
  },
}
