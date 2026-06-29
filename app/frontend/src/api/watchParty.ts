import { gateway } from './client'

export interface PartyMember {
  profileId: string
  name: string
  joinedAt: string
}

export interface PartyState {
  isPlaying: boolean
  positionSeconds: number
  updatedAt: string
  updatedBy: string
}

export interface WatchPartyRoom {
  partyId: string
  code: string
  contentId: string
  contentTitle: string
  posterUrl: string
  videoRef: string
  videoSource: string
  hostProfileId: string
  members: PartyMember[]
  state: PartyState
  expiresAt: string
}

export const watchPartyAPI = {
  create: async (data: {
    contentId: string
    contentTitle: string
    posterUrl?: string
    videoRef?: string
    videoSource?: string
    hostName?: string
  }): Promise<WatchPartyRoom> => {
    const res = await gateway.post('/watch-party', data)
    return res.data as WatchPartyRoom
  },

  getRoom: async (code: string): Promise<WatchPartyRoom> => {
    const res = await gateway.get(`/watch-party/${code}`)
    return res.data as WatchPartyRoom
  },

  join: async (code: string, displayName?: string): Promise<WatchPartyRoom> => {
    const res = await gateway.post(`/watch-party/${code}/join`, { displayName })
    return res.data as WatchPartyRoom
  },

  getState: async (code: string): Promise<PartyState & { members: PartyMember[] }> => {
    const res = await gateway.get(`/watch-party/${code}/state`)
    return res.data as PartyState & { members: PartyMember[] }
  },

  updateState: async (
    code: string,
    isPlaying: boolean,
    positionSeconds: number,
  ): Promise<PartyState> => {
    const res = await gateway.post(`/watch-party/${code}/state`, { isPlaying, positionSeconds })
    return res.data as PartyState
  },

  leave: async (code: string): Promise<void> => {
    await gateway.delete(`/watch-party/${code}`)
  },
}
