import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Testes de componente do renderer.
 *
 * Existem porque a bateria em `scripts/` cobre o processo principal e a fiação,
 * mas nada olhava a tela: um formulário podia oferecer categoria do tipo errado
 * ou parar de validar sem nada ficar vermelho.
 *
 * O `window.pluto` é falso aqui (ver `testes/preparo.ts`) — o objetivo é o
 * comportamento do componente, não o do banco, que já tem teste próprio.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/renderer/testes/preparo.ts'],
    include: ['src/renderer/testes/**/*.teste.tsx'],
    css: false
  }
})
