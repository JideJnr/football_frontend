import { create } from 'zustand'
import * as api from '../services/api' // we'll define this

interface BotState {
botStatus: boolean
loading: boolean
error: string | null
startBot: () => Promise<void>
stopBot: () => Promise<void>
}

export const useBotStore = create<BotState>((set) => ({
botStatus: false,
loading: false,
error: null,

startBot: async () => {
set({ loading: true, error: null })
try {
const res = await api.startBot()
if (!res || !res.message?.includes('started')) {
throw new Error(res?.error || 'Failed to start bot')
}
set({ botStatus: true, loading: false })
} catch (err: any) {
set({ error: err.message || 'Unknown error', loading: false })
}
},

stopBot: async () => {
set({ loading: true, error: null })
try {
const res = await api.stopBot()
if (!res || !res.message?.includes('stopped')) {
throw new Error(res?.error || 'Failed to stop bot')
}
set({ botStatus: false, loading: false })
} catch (err: any) {
set({ error: err.message || 'Unknown error', loading: false })
}
},
}))