import { api } from './auth'

export interface BackendProfile {
  profileId: string
  displayName: string
  isKidsMode: boolean
  avatarUrl?: string
}

export interface ListProfilesResponse {
  profiles: BackendProfile[]
  count: number
  maxAllowed: number
}



export const profilesAPI = {
  listProfiles: async (userId: string) => {
    const res = await api.get('/auth/profiles', {
      params: {
        user_id: userId,
      },
    })

    return res.data as ListProfilesResponse
  },

  createProfile: async (
    userId: string,
    displayName: string,
    isKidsMode = false,
  ) => {
    const res = await api.post('/auth/profiles', {
      user_id: userId,
      display_name: displayName,
      is_kids_mode: isKidsMode,
      avatar_url: '',
    })

    return res.data
  },

  selectProfile: async (
    userId: string,
    profileId: string,
  ) => {
    const res = await api.post('/auth/profiles/select', {
      user_id: userId,
      profile_id: profileId,
    })

    return res.data
  },

  updateProfile: async (
    userId: string,
    profileId: string,
    displayName: string,
    isKidsMode: boolean,
  ) => {
    const res = await api.patch(
      `/auth/profiles/${profileId}`,
      {
        user_id: userId,
        display_name: displayName,
        is_kids_mode: isKidsMode,
      },
    )

    return res.data
  },

  deleteProfile: async (
    userId: string,
    profileId: string,
  ) => {
    const res = await api.delete(
      `/auth/profiles/${profileId}`,
      {
        data: {
          user_id: userId,
        },
      },
    )

    return res.data
  },

  setParentalPin: async (pin: string) => {
    const res = await api.post('/auth/parental/pin', { pin })
    return res.data as { success: boolean; message: string }
  },

  verifyParentalPin: async (pin: string) => {
    const res = await api.post('/auth/parental/verify', { pin })
    return res.data as { valid: boolean }
  },
}