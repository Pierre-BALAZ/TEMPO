import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('malformed broadcast entries cannot poison persisted case or stop outgoing updates', async ({ app, screen, browser }) => {
  await app.open()
  await screen.getByRole('button', 'Régulateur SAMU / Centre 15').tap()
  await browser.evaluate(async () => {
    const w = window as any
    w.__peer = new BroadcastChannel('balaz-sync-v1')
    w.__messages = []
    w.__peer.onmessage = (e: MessageEvent) => w.__messages.push(e.data.caseState)
    const base = JSON.parse(localStorage.getItem('balaz.case.v1')!)
    w.__peer.postMessage({ from: 'bad-null', caseState: { ...base, values: { 'prehosp.c.pas': null } } })
    await new Promise(resolve => setTimeout(resolve, 100))
  })
  await screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)').fill('FICTIF AFTER INVALID')
  await expect.poll(() => browser.evaluate(() => (window as any).__messages.some((c: any) => c.header.patientCodename === 'FICTIF AFTER INVALID'))).toBe(true)
  await expect.poll(() => browser.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('balaz.case.v1')!).values))).toEqual([])
  await browser.evaluate(() => (window as any).__peer.close())
})

test('malformed shared hash and saved entries fall back to usable empty case', async ({ app, screen, browser }) => {
  await app.open()
  const url = await browser.evaluate(async () => {
    const { encodeCase } = await import('/src/share/urlState.ts')
    const c = JSON.parse(localStorage.getItem('balaz.case.v1')!)
    c.values = { 'prehosp.c.pas': null }
    localStorage.setItem('balaz.case.v1', JSON.stringify(c))
    return '/#s=' + encodeCase(c)
  })
  await browser.goto(url)
  await browser.reload()
  await screen.getByRole('button', 'Régulateur SAMU / Centre 15').tap()
  await screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)').fill('FICTIF SAFE FALLBACK')
  await expect.poll(() => browser.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('balaz.case.v1')!).values))).toEqual([])
})

test('History SecurityError preserves editor UI and fresh case after immediate reload', async ({ app, screen, browser }) => {
  await app.open()
  const url = await browser.evaluate(async () => {
    const { encodeCase } = await import('/src/share/urlState.ts')
    return '/#s=' + encodeCase(JSON.parse(localStorage.getItem('balaz.case.v1')!))
  })
  await browser.goto(url)
  await browser.reload()
  await screen.getByRole('button', 'Régulateur SAMU / Centre 15').tap()
  await browser.evaluate(() => { history.replaceState = () => { throw new DOMException('Controlled refusal', 'SecurityError') } })
  await screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)').fill('FICTIF FRESH')
  await expect(screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)')).toHaveValue('FICTIF FRESH')
  await browser.reload()
  await screen.getByRole('button', 'Régulateur SAMU / Centre 15').tap()
  await expect(screen.getByPlaceholder('Nom de code (ex. Chopin, 314…)')).toHaveValue('FICTIF FRESH')
})
