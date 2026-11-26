import { expect, test } from '@playwright/test'
import type { Page, Response } from '@playwright/test'

async function openOrderReview(page: Page) {
  await page.goto('/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  const login = page.getByRole('dialog', { name: 'Acesso à Kurio' })
  await login.getByLabel('E-mail').fill('colecionador@kurio.test')
  await login.getByLabel('Senha', { exact: true }).fill('KurioDemo123')
  await login.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Minha conta' })).toBeVisible()

  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()

  const profile = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Perfil do colecionador' }),
  })

  await profile.getByLabel('Nome de exibição').fill('Colecionador de teste')
  await profile.getByLabel('Nome de usuário').fill('colecionadorteste')
  await profile.getByLabel('Nome do perfil').fill('Coleção de teste')
  await profile.getByLabel('Rede').selectOption('Ethereum')
  await profile.getByLabel('Endereço da carteira')
    .fill('0x1111111111111111111111111111111111111111')
  await profile.getByLabel('Tipo de carteira').selectOption('Extensão')
  await profile.getByLabel('Código de indicação').fill('DEMO')
  await profile.getByLabel('Nome ENS').fill('colecionador')
  await page.getByRole('radio', { name: 'MetaMask', exact: true }).check()
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
}

function isOrderSubmission(response: Response) {
  return new URL(response.url()).pathname === '/api/checkout/orders' &&
    response.request().method() === 'POST'
}

async function confirmAndReadReceipt(page: Page, disconnect: boolean) {
  await openOrderReview(page)

  await page.evaluate((shouldDisconnect) => {
    sessionStorage.setItem('kurio:checkout-scenario', 'pending-realtime')

    if (shouldDisconnect) {
      sessionStorage.setItem('kurio:disconnect-before-order-update', 'armed')
    }
  }, disconnect)

  const statusResponses: Response[] = []

  function recordStatus(response: Response) {
    const path = new URL(response.url()).pathname
    if (path.startsWith('/api/checkout/attempts/') && response.request().method() === 'GET') {
      statusResponses.push(response)
    }
  }

  page.on('response', recordStatus)

  try {
    const [firstResponse] = await Promise.all([
      page.waitForResponse(isOrderSubmission),
      page.getByRole('button', { name: 'Confirmar pedido', exact: true }).click(),
    ])

    expect(firstResponse.status()).toBe(202)
    expect(await firstResponse.json()).toMatchObject({ status: 'pending' })

    const attemptKey = await firstResponse.request().headerValue('Idempotency-Key')
    expect(attemptKey).toBeTruthy()
    const statusPath = `/api/checkout/attempts/${encodeURIComponent(attemptKey ?? '')}`

    const receipt = page.getByRole('dialog', {
      name: 'Seus NFTs agora estão na sua carteira',
    })

    await expect(receipt).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/checkout#pedido-[0-9a-f-]+$/)
    await expect(receipt).toContainText('2.396 ETH')

    const orderId = new URL(page.url()).hash.slice('#pedido-'.length)
    const matchingResponses = statusResponses.filter((response) =>
      new URL(response.url()).pathname === statusPath && response.status() === 200,
    )

    const states = await Promise.all(matchingResponses.map((response) => response.json()))
    expect(states).toContainEqual({ status: 'confirmed', orderId })

    if (disconnect) {
      const scenario = await page.evaluate(() =>
        sessionStorage.getItem('kurio:disconnect-before-order-update'),
      )
      expect(scenario, 'O mock deve fechar o WebSocket antes de enviar o evento').toBe('triggered')
    }

    await page.goto('/profile?section=orders')
    await expect(page.getByText(`Pedido ${orderId}`, { exact: true })).toHaveCount(1)
    await expect(page.getByText(/^Pedido [0-9a-f-]+$/)).toHaveCount(1)
  } finally {
    page.off('response', recordStatus)
  }
}

test('abre o comprovante automaticamente após order.updated', async ({ page }) => {
  test.setTimeout(60_000)
  await confirmAndReadReceipt(page, false)
})

test('recupera o pedido quando o WebSocket cai antes de entregar o evento', async ({ page }) => {
  test.setTimeout(60_000)
  await confirmAndReadReceipt(page, true)
})