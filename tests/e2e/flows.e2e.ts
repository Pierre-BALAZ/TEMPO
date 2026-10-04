import { test, beforeEach } from '@e2e-dev/web'
import { expect } from 'e2e'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildRecap } from '../../src/lib/recap.ts'
import { activeProtocol, actionIndex } from '../../src/config/index.ts'
import { actions } from '../../src/config/protocols/polytrauma/actions.ts'

beforeEach(async ({ app, screen, browser }) => {
  // Prevent any vendor requests: room HTTP tests are explicitly mocked below.
  await browser.route('https://**', async r => { await r.abort() })
  await app.open()
  await screen.getByRole('button', 'Régulateur SAMU / Centre 15').tap()
  await screen.getByRole('button', 'Pupitre', { exact: true }).tap()
})

for (const [track, role] of [['regul', 'Régulateur'], ['prehosp', 'SMUR / VSAV'], ['intra', 'Intra-hosp']] as const) {
  test(`${track}: every editable action persists and reverses; foreign tracks read-only`, async ({ screen, browser }) => {
    await screen.getByRole('button', role, { exact: true }).tap()
    for (const action of actions.filter(a => a.trackId === track && a.type !== 'computed' && !a.lockedByDefault && !a.detail?.widget)) {
      const card = browser.locator(`[data-action-id="${action.id}"]`)
      const editor = action.type === 'checkbox' ? card.getByRole('button', 'Cocher') : card.getByRole(action.type === 'select' ? 'combobox' : action.type === 'number' ? 'spinbutton' : 'textbox')
      if (action.type === 'checkbox') await editor.tap()
      else if (action.type === 'select') await editor.selectOption({ value: action.options![0].value })
      else await editor.fill(action.type === 'number' ? '12' : 'FICTIF E2E')
      const expected = action.type === 'checkbox' ? true : action.type === 'select' ? action.options![0].value : action.type === 'number' ? 12 : 'FICTIF E2E'
      await expect.poll(() => browser.evaluate(id => JSON.parse(localStorage.getItem('balaz.case.v1')!).values[id]?.value, action.id)).toBe(expected)
      if (action.type === 'checkbox') await card.getByRole('button', 'Décocher').tap()
      else if (action.type === 'select') await editor.selectOption({ value: '' })
      else await editor.fill('')
      await expect.poll(() => browser.evaluate(id => JSON.parse(localStorage.getItem('balaz.case.v1')!).values[id]?.value, action.id)).toBe(null)
    }
    for (const action of actions.filter(a => a.trackId !== track && a.type !== 'computed' && !a.detail?.widget && !a.lockedByDefault)) {
      const card = browser.locator(`[data-action-id="${action.id}"]`)
      await expect(action.type === 'checkbox' ? card.getByRole('button', 'Cocher') : card.getByRole(action.type === 'number' ? 'spinbutton' : action.type === 'select' ? 'combobox' : 'textbox')).toBeDisabled()
    }
  })
}

test('Vittel criteria, three-track unlock chain, timestamps and reload', async ({ screen, browser }) => {
  const card = (id: string) => browser.locator(`[data-action-id="${id}"]`)
  await expect(card('regul.prealerte.centre').getByRole('button', 'Cocher')).toBeDisabled()
  await card('regul.appel.vittel').getByRole('button', 'Détail').tap()
  await browser.locator('aside').getByRole('button', 'Glasgow < 13', { exact: true }).tap()
  await screen.getByRole('button', 'Fermer', { exact: true }).tap()
  await expect(card('regul.appel.vittel')).toContainText('1')
  await screen.getByRole('button', 'SMUR / VSAV', { exact: true }).tap()
  await card('prehosp.scores.grade').getByRole('combobox').selectOption({ value: 'A' })
  await screen.getByRole('button', 'Régulateur', { exact: true }).tap()
  await card('regul.prealerte.centre').getByRole('button', 'Cocher').tap()
  await screen.getByRole('button', 'Intra-hosp', { exact: true }).tap()
  await card('intra.activation.equipe').getByRole('button', 'Cocher').tap()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!).values['intra.activation.equipe']?.completedAt > 0)).toBe(true)
  await browser.reload()
  await screen.getByRole('button', 'Observateur Démo / lecture seule').tap()
  await expect(card('intra.activation.equipe').getByRole('button', 'Décocher')).toBeDisabled()
})

test('demo, URL hydration priority, share snapshot, local reload, reset accept/dismiss, PDF', async ({ screen, browser, app }) => {
  await screen.getByRole('button', 'Scénario démo', { exact: true }).tap()
  const demo = await browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!))
  await expect(Object.keys(demo.values).length).toBeGreaterThan(10)
  await browser.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (s: string) => { (window as any).__shared = s } } }) })
  await screen.getByRole('button', 'Copier le lien', { exact: true }).tap()
  const link = await browser.evaluate(() => (window as any).__shared)
  await expect(link).toContain('#')
  await screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)').fill('FICTIF MODIFIE')
  await browser.reload()
  await screen.getByRole('button', 'Observateur Démo / lecture seule').tap()
  await expect(screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)')).toHaveValue('FICTIF MODIFIE')
  await browser.goto(link)
  await browser.reload()
  await screen.getByRole('button', 'Observateur Démo / lecture seule').tap()
  await expect(screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)')).toHaveValue(demo.header.patientCodename ?? '')
  await expect(await browser.url()).not.toContain('#')
  await screen.getByRole('button', 'Récap', { exact: true }).tap()
  await expect(screen.getByRole('table').getByRole('row')).toHaveCount(buildRecap(demo, activeProtocol, actionIndex).length + 1)
  await screen.getByRole('button', 'Fermer', { exact: true }).tap()
  const download = await browser.waitForDownload(() => screen.getByRole('button', 'Exporter PDF', { exact: true }).tap())
  await expect(download.suggestedFilename).toContain('.pdf')
  const files = await readdir('.e2e/artifacts', { recursive: true })
  const saved = files.find(f => f.endsWith(download.path))
  await expect(saved).toBeDefined()
  const pdf = await readFile(join('.e2e/artifacts', saved!))
  await expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  await expect(pdf.length).toBeGreaterThan(1000)
  await screen.getByRole('button', 'Régulateur', { exact: true }).tap()
  const dismiss = await browser.onDialog('dismiss')
  await screen.getByRole('button', 'Réinitialiser', { exact: true }).tap()
  await expect(screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)')).toHaveValue(demo.header.patientCodename ?? '')
  await dismiss()
  await browser.onDialog('accept')
  await screen.getByRole('button', 'Réinitialiser', { exact: true }).tap()
  await expect.poll(() => browser.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('balaz.case.v1')!).values).length)).toBe(0)
  await app.restart()
  await expect.poll(() => browser.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('balaz.case.v1')!).values).length)).toBe(0)
})

test('room HTTP mock: publish persisted case, receive remote changes, recover failure, stop', async ({ screen, browser }) => {
  let room: any = null
  let failure = false
  let writes = 0
  await browser.route('http://127.0.0.1:4415/**', async r => {
    if (failure) { await r.fulfill({ status: 503, json: { error: 'test offline' } }); return }
    if (r.request.method === 'POST') { room = JSON.parse(r.request.postData!).case; writes++ }
    await r.fulfill({ json: { v: writes, case: room } })
  })
  await screen.getByRole('button', 'Rejoindre', { exact: true }).tap()
  await expect(screen.getByText('En direct', { exact: true })).toBeVisible()
  await expect(writes).toBeGreaterThan(0)
  room.values['regul.moyens.vsav'] = { value: true, completedAt: Date.now() + 1000 }
  await expect(browser.locator('[data-action-id="regul.moyens.vsav"]').getByRole('button', 'Décocher')).toBeVisible()
  failure = true
  await expect(screen.getByText('Erreur de connexion', { exact: true })).toBeVisible()
  failure = false
  await expect(screen.getByText('En direct', { exact: true })).toBeVisible()
  await screen.getByRole('button', 'Arrêter', { exact: true }).tap()
  await expect(screen.getByText('Hors ligne', { exact: true })).toBeVisible()
})

test('layout collapse, guided pause/resume/exit and unavailable speech', async ({ screen, browser }) => {
  await screen.getByRole('button', 'Tout réduire', { exact: true }).tap()
  await screen.getByRole('button', 'Tout développer', { exact: true }).tap()
  await screen.getByRole('button', 'Portée', { exact: true }).tap()
  await screen.getByRole('button', 'Pupitre', { exact: true }).tap()
  await screen.getByRole('button', 'Démo guidée', { exact: true }).tap()
  await screen.getByRole('button', 'Pause', { exact: true }).tap()
  await screen.getByRole('button', '2×', { exact: true }).tap()
  await screen.getByRole('button', 'Reprendre', { exact: true }).tap()
  await browser.locator('button[title="Quitter la démo guidée"]').tap()
  await expect(screen.getByRole('button', 'Démo guidée', { exact: true })).toBeVisible()
  await browser.addInitScript(() => { delete (window as any).webkitSpeechRecognition; delete (window as any).SpeechRecognition })
  await browser.reload()
  await screen.getByRole('button', 'Observateur Démo / lecture seule').tap()
  await screen.getByRole('button', 'Ouvrir le panneau de dictée').tap()
  await expect(screen.getByText('La reconnaissance vocale n’est pas disponible dans ce navigateur. Essayez Chrome ou Edge.')).toBeVisible()
})

for (const [track, role] of [['regul', 'Régulateur'], ['prehosp', 'SMUR / VSAV'], ['intra', 'Intra-hosp']] as const) {
  test(`${track}: every detail subfield editable by owner and disabled for observer`, async ({ screen, browser }) => {
    await screen.getByRole('button', role, { exact: true }).tap()
    for (const action of actions.filter(a => a.trackId === track && a.detail?.subFields?.length)) {
      await browser.locator(`[data-action-id="${action.id}"]`).getByRole('button', 'Détail').tap()
      for (const sf of action.detail!.subFields!) {
        const aside = browser.locator('aside')
        const control = sf.type === 'checkbox' || sf.type === 'timestamp'
          ? aside.getByRole('button', sf.type === 'timestamp' ? `${sf.label} — noter l’heure` : sf.label, { exact: true })
          : sf.gauge ? aside.getByRole('slider').nth(action.detail!.subFields!.filter(s => s.gauge).indexOf(sf))
          : aside.getByLabel(sf.label, { exact: true })
        if (sf.type === 'checkbox' || sf.type === 'timestamp') await control.tap()
        else if (sf.type === 'select') await control.selectOption({ value: sf.options![0].value })
        else if (sf.gauge) await control.press('ArrowRight')
        else await control.fill(sf.type === 'number' ? String(sf.gauge?.normalMin ?? sf.gauge?.min ?? 12) : 'FICTIF DETAIL')
        const id = sf.bindTo ?? `${action.id}::${sf.id}`
        await expect.poll(() => browser.evaluate(key => JSON.parse(localStorage.getItem('balaz.case.v1')!).values[key]?.value != null, id)).toBe(true)
      }
      await screen.getByRole('button', 'Fermer', { exact: true }).tap()
    }
    await screen.getByRole('button', 'Observateur', { exact: true }).tap()
    for (const action of actions.filter(a => a.trackId === track && a.detail?.subFields?.length)) {
      await browser.locator(`[data-action-id="${action.id}"]`).getByRole('button', 'Détail').tap()
      const controls = await browser.locator('aside fieldset input, aside fieldset select, aside fieldset button').all()
      for (const c of controls) await expect(c).toBeDisabled()
      await screen.getByRole('button', 'Fermer', { exact: true }).tap()
    }
  })
}

test('evolution note add/delete, Wallace select/clear, stopwatch permissions and resume', async ({ screen, browser }) => {
  await screen.getByRole('button', 'SMUR / VSAV', { exact: true }).tap()
  const log = actions.find(a => a.detail?.widget === 'evolutionLog')!
  await browser.locator(`[data-action-id="${log.id}"]`).getByRole('button', 'Détail').tap()
  await expect(screen.getByRole('button', 'Ajouter la note (horodatée maintenant)')).toBeDisabled()
  await screen.getByPlaceholder('Nouvelle note d’évolution (constantes, geste, événement…)').fill('FICTIF note e2e')
  await screen.getByRole('button', 'Ajouter la note (horodatée maintenant)').tap()
  await expect(browser.locator('aside')).toContainText('FICTIF note e2e')
  await screen.getByRole('button', 'Supprimer la note').tap()
  await expect(browser.locator('aside')).toContainText('Aucune note pour le moment.')
  await screen.getByRole('button', 'Fermer', { exact: true }).tap()
  await browser.locator('[data-action-id="prehosp.brulures.wallace"]').getByRole('button', 'Détail').tap()
  await browser.locator('aside svg g').first().tap()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!).values['prehosp.brulures.wallace::f-head']?.value)).toBe(true)
  await browser.locator('aside svg g').nth(3).tap()
  await browser.locator('aside svg g').nth(4).tap()
  await expect(browser.locator('aside')).toContainText('22.5')
  await screen.getByRole('button', 'Fermer', { exact: true }).tap()
  await browser.locator('[data-action-id="prehosp.brulures.remplissage"]').getByRole('button', 'Cocher').tap()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!).values['prehosp.brulures.remplissage']?.value)).toBe(true)
  await browser.locator('[data-action-id="prehosp.brulures.remplissage"]').getByRole('button', 'Décocher').tap()
  await browser.locator('[data-action-id="prehosp.brulures.wallace"]').getByRole('button', 'Détail').tap()
  await screen.getByRole('button', 'Tout effacer', { exact: true }).tap()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!).values['prehosp.brulures.wallace::f-head']?.value)).toBe(null)
  await screen.getByRole('button', 'Fermer', { exact: true }).tap()
  await expect(browser.locator('[data-action-id="prehosp.brulures.remplissage"]').getByRole('button', 'Cocher')).toBeDisabled()
  await expect(screen.getByRole('button', 'Arrêter', { exact: true })).toHaveCount(0)
  await screen.getByRole('button', 'Intra-hosp', { exact: true }).tap()
  await screen.getByRole('button', 'Arrêter', { exact: true }).tap()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!).header.chronoStoppedAt > 0)).toBe(true)
  await screen.getByRole('button', 'Reprendre', { exact: true }).tap()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!).header.chronoStoppedAt ?? null)).toBe(null)
})

test('BroadcastChannel remote merge and malformed message; corrupt URL/storage fallback', async ({ screen, browser }) => {
  await browser.evaluate(() => {
    const c = new BroadcastChannel('balaz-sync-v1')
    const state = JSON.parse(localStorage.getItem('balaz.case.v1')!)
    state.values['regul.moyens.vsav'] = { value: true, completedAt: Date.now() + 1000 }
    c.postMessage({ from: 'fictif-second-window', caseState: state })
    c.postMessage({ from: 'invalid', caseState: { values: {} } })
    c.close()
  })
  await expect(browser.locator('[data-action-id="regul.moyens.vsav"]').getByRole('button', 'Décocher')).toBeVisible()
  await browser.evaluate(() => localStorage.setItem('balaz.case.v1', '{corrupt'))
  await browser.goto('/#s=invalid')
  await browser.reload()
  await screen.getByRole('button', 'Observateur Démo / lecture seule').tap()
  await expect.poll(() => browser.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('balaz.case.v1')!).values).length)).toBe(0)
})

test('mobile owner editor, header fields, sources, WhatsApp and print popup blocked', async ({ screen, browser }) => {
  await browser.setViewport({ width: 390, height: 844 })
  await screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)').fill('FICTIF MOBILE')
  await screen.getByPlaceholder('Dr / SAMU…').fill('FICTIF REGUL')
  await screen.getByRole('button', 'SMUR / VSAV', { exact: true }).tap()
  await screen.getByPlaceholder('Équipe préhosp…').fill('FICTIF SMUR')
  await screen.getByRole('button', 'Intra-hosp', { exact: true }).tap()
  await screen.getByPlaceholder('Déchocage / SAUV…').fill('FICTIF INTRA')
  await screen.getByRole('button', 'Régulateur', { exact: true }).tap()
  await browser.locator('[data-action-id="regul.moyens.vsav"]').getByRole('button', 'Cocher').tap()
  await expect.poll(() => browser.evaluate(() => JSON.parse(localStorage.getItem('balaz.case.v1')!).header)).toMatchObject({ patientCodename: 'FICTIF MOBILE', regulateurName: 'FICTIF REGUL', smurName: 'FICTIF SMUR', serviceReceveur: 'FICTIF INTRA' })
  await browser.locator('summary').tap()
  await expect(browser.locator('details')).toHaveAttribute('open')
  await browser.evaluate(() => { window.open = ((url: string) => { (window as any).__popup = url; return null }) as any })
  await screen.getByRole('button', 'Partager le lien par WhatsApp').tap()
  await expect(await browser.evaluate(() => (window as any).__popup)).toContain('https://wa.me/?text=')
  await screen.getByRole('button', 'Récap', { exact: true }).tap()
  let blocked = ''
  await browser.onDialog(async d => { blocked = d.message; await d.accept() })
  await screen.getByRole('button', 'Imprimer / PDF', { exact: true }).tap()
  await expect(blocked).toContain('Autorisez les fenêtres pop-up')
})

test('hold-to-reset completes without a second confirmation and stays empty after reload', async ({ screen, browser }) => {
  await screen.getByRole('button', 'Scénario démo', { exact: true }).tap()
  await expect.poll(() => browser.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('balaz.case.v1')!).values).length)).toBeGreaterThan(10)
  let dialogs = 0
  await browser.onDialog(async d => { dialogs++; await d.dismiss() })
  await screen.getByRole('button', 'Réinitialiser', { exact: true }).longPress({ duration: 2300 })
  await expect.poll(() => browser.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('balaz.case.v1')!).values).length)).toBe(0)
  await expect(dialogs).toBe(0)
  await browser.reload()
  await expect.poll(() => browser.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('balaz.case.v1')!).values).length)).toBe(0)
})
