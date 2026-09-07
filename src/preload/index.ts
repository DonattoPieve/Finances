import { contextBridge } from 'electron'
import { api } from './api'

try {
  contextBridge.exposeInMainWorld('pluto', api)
} catch (error) {
  console.error('Falha ao expor a API do Pluto no contexto da janela:', error)
}
