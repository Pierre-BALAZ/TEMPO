import { test } from '@e2e-dev/web'
import { expect } from 'e2e'
test('observer cannot change Vittel detail criteria', async ({ app, screen, browser }) => {
  await app.open()
  await screen.getByRole('button', 'Observateur Démo / lecture seule').tap()
  await screen.getByRole('button', 'Pupitre', { exact: true }).tap()
  await browser.locator('[data-action-id="regul.appel.vittel"]').getByRole('button', 'Détail').tap()
  await expect(browser.locator('aside button').filter({ hasText: 'Glasgow' })).toBeDisabled()
})

test('live role change during reset confirmation and guided playback preserves original persisted case', async ({ app, screen, browser }) => {
  await app.open()
  await screen.getByRole('button', 'Régulateur SAMU / Centre 15').tap()
  await screen.getByRole('button', 'Scénario démo', { exact: true }).tap()
  const initial = await browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!))
  // A synchronous confirm adapter changes role before the reset handler resumes.
  await browser.evaluate(async () => {
    const ui = await import('/src/store/uiStore.ts')
    window.confirm = () => { ui.useUiStore.getState().setActiveRole('observer'); return true }
  })
  await screen.getByRole('button', 'Réinitialiser', { exact: true }).tap()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!))).toEqual(initial)
  await expect(screen.getByRole('button', 'Réinitialiser', { exact: true })).toBeDisabled()
  await screen.getByRole('button', 'Régulateur', { exact: true }).tap()
  await screen.getByRole('button', 'Démo guidée', { exact: true }).tap()
  await screen.getByRole('button', 'Observateur', { exact: true }).tap()
  await expect(screen.getByRole('button', 'Démo guidée', { exact: true })).toBeDisabled()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!))).toEqual(initial)
  // Queued restart/play operations cannot write after the role transition.
  await browser.evaluate(async () => {
    const player = await import('/src/store/playerStore.ts')
    player.usePlayerStore.getState().restart()
    player.usePlayerStore.getState().play()
  })
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!))).toEqual(initial)
})
