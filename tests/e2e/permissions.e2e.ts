import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
test('observer cannot change Vittel detail criteria', async ({ app, screen, browser }) => {
  await app.open()
  await screen.getByRole('button', 'Observateur Démo / lecture seule').tap()
  await screen.getByRole('button', 'Pupitre', { exact: true }).tap()
  await browser.locator('[data-action-id="regul.appel.vittel"]').getByRole('button', 'Détail').tap()
  await expect(browser.locator('aside button').filter({ hasText: 'Glasgow' })).toBeDisabled()
})

test('guided playback stops on observer transition and late operations preserve current case', async ({ app, screen, browser }) => {
  await app.open()
  await screen.getByRole('button', 'Régulateur SAMU / Centre 15').tap()
  await screen.getByRole('button', 'Démo guidée', { exact: true }).tap()
  await screen.getByRole('button', 'Observateur', { exact: true }).tap()
  await expect(screen.getByRole('button', 'Démo guidée', { exact: true })).toBeDisabled()
  const current = await browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!))
  await browser.evaluate(async () => {
    const player = await import('/src/store/playerStore.ts')
    player.usePlayerStore.getState().restart()
    player.usePlayerStore.getState().play()
  })
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!))).toEqual(current)
})
