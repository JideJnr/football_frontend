import { create } from 'zustand'
import * as api from '../../services/basketballApi'

interface BotState {
    botStatus: boolean
    loading: boolean
    error: string | null
    startEngine: () => Promise<void>
    stopEngine: () => Promise<void>
    getAllBot: () => Promise<void>;
    startBotById: () => Promise<void>;
    stopBotById: () => Promise<void>;
    getStatusById: () => Promise<void>;
    getPlayerById: () => Promise<void>; 
}

export const useBotStore = create<BotState>((set) => ({
    
    botStatus: false,
    loading: false,
    error: null,

    startEngine: async () => {
        set({ loading: true, error: null })
        try {
            const res = await api.startEngine()
            if (!res || !res.message?.includes('started')) {
            throw new Error(res?.error || 'Failed to start bot')
        }
        set({ botStatus: true, loading: false })
    } 
        catch (err: any) {
            set({ error: err.message || 'Unknown error', loading: false })
        }
    },

    stopEngine: async () => {
    set({ loading: true, error: null })
    try {
    const res = await api.stopEngine()
    if (!res || !res.message?.includes('stopped')) {
    throw new Error(res?.error || 'Failed to stop bot')
    }
    set({ botStatus: false, loading: false })
    } catch (err: any) {
    set({ error: err.message || 'Unknown error', loading: false })
    }
    },

    checkEngineStatus: async () => {
    set({ loading: true, error: null })
    try {
    const res = await api.stopEngine()
    if (!res || !res.message?.includes('stopped')) {
    throw new Error(res?.error || 'Failed to stop bot')
    }
    set({ botStatus: false, loading: false })
    } catch (err: any) {
    set({ error: err.message || 'Unknown error', loading: false })
    }
    },

    getAllBot: async () => {
    set({ loading: true, error: null })
    try {
    const res = await api.stopEngine()
    if (!res || !res.message?.includes('stopped')) {
    throw new Error(res?.error || 'Failed to stop bot')
    }
    set({ botStatus: false, loading: false })
    } catch (err: any) {
    set({ error: err.message || 'Unknown error', loading: false })
    }
    },

    startBotById: async (id:string) => {
    set({ loading: true, error: null })
    try {
    const res = await api.startBotById(id)
    if (!res || !res.message?.includes('stopped')) {
    throw new Error(res?.error || 'Failed to stop bot')
    }
    set({ botStatus: false, loading: false })
    } catch (err: any) {
    set({ error: err.message || 'Unknown error', loading: false })
    }
    },

    stopBotById: async (id:string) => {
    set({ loading: true, error: null })
    try {
    const res = await api.startBotById(id)
    if (!res || !res.message?.includes('stopped')) {
    throw new Error(res?.error || 'Failed to stop bot')
    }
    set({ botStatus: false, loading: false })
    } catch (err: any) {
    set({ error: err.message || 'Unknown error', loading: false })
    }
    },

    getStatusById: async () => {
    set({ loading: true, error: null })
    try {
    const res = await api.stopEngine()
    if (!res || !res.message?.includes('stopped')) {
    throw new Error(res?.error || 'Failed to stop bot')
    }
    set({ botStatus: false, loading: false })
    } catch (err: any) {
    set({ error: err.message || 'Unknown error', loading: false })
    }
    },

    runBetBuilder: async () => {
    set({ loading: true, error: null })
    try {
    const res = await api.stopEngine()
    if (!res || !res.message?.includes('stopped')) {
    throw new Error(res?.error || 'Failed to stop bot')
    }
    set({ botStatus: false, loading: false })
    } catch (err: any) {
    set({ error: err.message || 'Unknown error', loading: false })
    }
    },

    postPrediction: async () => {
    set({ loading: true, error: null })
    try {
    const res = await api.stopEngine()
    if (!res || !res.message?.includes('stopped')) {
    throw new Error(res?.error || 'Failed to stop bot')
    }
    set({ botStatus: false, loading: false })
    } catch (err: any) {
    set({ error: err.message || 'Unknown error', loading: false })
    }
    },

                getPredictionById: async () => {
    set({ loading: true, error: null })
    try {
    const res = await api.stopEngine()
    if (!res || !res.message?.includes('stopped')) {
    throw new Error(res?.error || 'Failed to stop bot')
    }
    set({ botStatus: false, loading: false })
    } catch (err: any) {
    set({ error: err.message || 'Unknown error', loading: false })
    }
    },




}))