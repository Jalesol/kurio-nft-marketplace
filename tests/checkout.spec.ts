import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function prepareOrder(page: Page) {
  await page.goto('/nfts/emerald-ape-042')

  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(page).toHaveURL(/\/cart$/)

  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)

  const login = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Entre para finalizar' }),
  })

  await login.getByLabel('E-mail').fill('colecionador@kurio.test')
  await login.getByLabel('Senha').fill('KurioDemo123')
  await login.getByRole('button', { name: 'Entrar', exact: true }).click()

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

function receiptDialog(page: Page) {
  return page.getByRole('dialog', {
    name: 'Seus NFTs agora estão na sua carteira',
  })
}

async function expectReceiptItems(page: Page) {
  const receipt = receiptDialog(page)
  await expect(receipt).toBeVisible()

  const item = receipt.getByRole('listitem').filter({ hasText: 'Emerald Ape #042' })
  await expect(item).toContainText('× 2')
  await expect(item).toContainText('2.38 ETH')
  await expect(receipt).toContainText('2.396 ETH')
}

async function expectSingleOrder(page: Page, orderId: string) {
  await page.goto('/profile?section=orders')
  await expect(page.getByRole('heading', { name: 'Minhas compras' })).toBeVisible()
  await expect(page.getByText(`Pedido ${orderId}`, { exact: true })).toHaveCount(1)
  await expect(page.getByText(/^Pedido [0-9a-f-]+$/)).toHaveCount(1)
}

test('recupera o mesmo comprovante após atualizar a página', async ({ page }) => {
  await prepareOrder(page)
  await page.getByRole('button', { name: 'Confirmar pedido', exact: true }).click()

  await expect(page).toHaveURL(/\/checkout#pedido-[0-9a-f-]+$/)
  await expectReceiptItems(page)

  const receiptURL = page.url()
  const orderId = new URL(receiptURL).hash.slice('#pedido-'.length)

  await page.reload()

  await expect(page).toHaveURL(receiptURL)
  await expectReceiptItems(page)
  await expectSingleOrder(page, orderId)
})

test('recupera o pedido gravado quando a primeira resposta dá timeout', async ({ page }) => {
  test.setTimeout(60_000)

  await prepareOrder(page)
  await page.evaluate(() => {
    sessionStorage.setItem('kurio:checkout-scenario', 'timeout-after-confirm')
  })

  const confirm = page.getByRole('button', { name: 'Confirmar pedido', exact: true })

  await confirm.click()
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível acessar o carrinho. Tente novamente.',
    { timeout: 15_000 },
  )
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(receiptDialog(page)).toHaveCount(0)

  const originalOrderIds = await page.evaluate(async () => {
    const sessionResponse = await fetch('/api/checkout/session')
    if (!sessionResponse.ok) throw new Error('Falha ao consultar a sessão de teste.')

    const { session } = await sessionResponse.json() as {
      session: { token: string } | null
    }
    if (!session) throw new Error('A sessão de teste não foi encontrada.')

    const accountResponse = await fetch('/api/account', {
      headers: { Authorization: `Bearer ${session.token}` },
    })
    if (!accountResponse.ok) throw new Error('Falha ao consultar os pedidos da conta.')

    const { orders } = await accountResponse.json() as {
      orders: Array<{ id: string; status: string }>
    }
    return orders.filter((order) => order.status === 'confirmed').map((order) => order.id)
  })

  expect(originalOrderIds).toHaveLength(1)
  const orderId = originalOrderIds[0]!

  await confirm.click()

  await expect(page).toHaveURL(`/checkout#pedido-${orderId}`)
  await expectReceiptItems(page)
  await expectSingleOrder(page, orderId)
})