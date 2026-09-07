import type { PlutoApi } from '../../preload/api'

declare global {
  interface Window {
    pluto: PlutoApi
  }
}

export {}
