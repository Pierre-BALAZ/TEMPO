import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('timestamped current-main vitals append inline/detail, reload, and reject a late observer prompt', async ({ app, screen, browser }) => {
  await app.open()
  await screen.getByRole('button', 'SMUR / VSAV Équipe pré-hospitalière').tap()
  await screen.getByRole('button', 'Pupitre', { exact: true }).tap()
  const card = browser.locator('[data-action-id="prehosp.c.pas"]')
  await card.getByRole('spinbutton').fill('86')
  await card.getByRole('button', 'Ajouter la valeur').tap()
  await card.getByRole('spinbutton').fill('95')
  await card.getByRole('spinbutton').press('Enter')
  await card.getByRole('button', 'Détail').tap()
  const done = await browser.onDialog(async d => { await d.accept('100') })
  await browser.locator('aside').getByRole('button', 'Ajouter valeur', { exact: true }).tap()
  await done()
  await expect.poll(() => browser.evaluate(() => String(JSON.parse(localStorage.getItem('balaz.case.v1')!).values['prehosp.c.pas']?.value).split('|').map(p => p.split(':').at(-1)))).toEqual(['86', '95', '100'])
  // Prompt completion after a role change must not write via a stale callback.
  await browser.evaluate(async () => { const ui = await import('/src/store/uiStore.ts'); window.prompt = () => { ui.useUiStore.getState().setActiveRole('observer'); return '70' } })
  await browser.locator('aside').getByRole('button', 'Ajouter valeur', { exact: true }).tap()
  await expect.poll(() => browser.evaluate(() => String(JSON.parse(localStorage.getItem('balaz.case.v1')!).values['prehosp.c.pas']?.value).split('|').length)).toBe(3)
  await browser.reload()
  await screen.getByRole('button', 'Observateur Démo / lecture seule').tap()
  await screen.getByRole('button', 'Pupitre', { exact: true }).tap()
  await card.getByRole('button', 'Détail').tap()
  await expect(browser.locator('aside')).toContainText('3 valeur(s)')
  await expect(browser.locator('aside').getByRole('button', 'Ajouter valeur', { exact: true })).toHaveCount(0)
})

test('current-main eFAST six zones cycle present/absent/clear and stay read-only for observer', async ({ app, screen, browser }) => {
  await app.open()
  await screen.getByRole('button', 'SMUR / VSAV Équipe pré-hospitalière').tap()
  await screen.getByRole('button', 'Pupitre', { exact: true }).tap()
  const detail = browser.locator('[data-action-id="prehosp.c.fast"]').getByRole('button', 'Détail')
  await detail.tap()
  const zones = ['pericarde', 'hemo_droit', 'hemo_gauche', 'bassin', 'pnx_droit', 'pnx_gauche']
  const labels = ['Péricarde', 'Hémothorax D + Espace de Morisson', 'Hémothorax G + Espace de Kuhler', 'Cul de sac de Douglas', 'Pneumothorax droit', 'Pneumothorax gauche']
  for (let i = 0; i < zones.length; i++) {
    const zone = browser.locator(`aside div[title="Cliquez pour modifier : ${labels[i]}"]`)
    for (const v of ['present', 'absent', null]) {
      await zone.tap()
      await expect.poll(() => browser.evaluate(key => JSON.parse(localStorage.getItem('balaz.case.v1')!).values[key]?.value, `prehosp.c.fast::${zones[i]}`)).toBe(v)
    }
  }
  await screen.getByRole('button', 'Fermer', { exact: true }).tap()
  await screen.getByRole('button', 'Observateur', { exact: true }).tap()
  await detail.tap()
  await browser.locator('aside div[title="Cliquez pour modifier : Péricarde"]').tap()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!).values['prehosp.c.fast::pericarde']?.value)).toBe(null)
})
