import { create } from 'zustand'

interface PredictionState {
    loading: boolean
    error: string | null   
}

export const usePredictionStore = create<PredictionState>((set) => ({
    loading: false,
    error: null,


}))