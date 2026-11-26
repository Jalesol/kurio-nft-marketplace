import { expect, test } from '@playwright/test'

test('recupera o pedido original com F5 antes de o comprovante abrir', async ({ page }) => {
  test.setTimeout(60_000)

  await page.goto('/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()

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
  await page.evaluate(() => {
    sessionStorage.setItem('kurio:checkout-scenario', 'timeout-after-confirm')
  })

  await page.getByRole('button', { name: 'Confirmar pedido', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível acessar o carrinho. Tente novamente.',
    { timeout: 15_000 },
  )
  await expect(page).toHaveURL(/\/checkout$/)

  const originalOrders = await page.evaluate(async () => {
    const sessionResponse = await fetch('/api/checkout/session')
    if (!sessionResponse.ok) throw new Error('Falha ao consultar a sessão.')

    const { session } = await sessionResponse.json() as {
      session: { token: string } | null
    }
    if (!session) throw new Error('A sessão não está disponível.')

    const response = await fetch('/api/account', {
      headers: { Authorization: `Bearer ${session.token}` },
    })
    if (!response.ok) throw new Error('Falha ao consultar o histórico.')

    const { orders } = await response.json() as {
      orders: Array<{ id: string; status: string }>
    }
    return orders.filter((order) => order.status === 'confirmed')
  })

  expect(originalOrders).toHaveLength(1)
  const orderId = originalOrders[0]!.id

  await page.reload()

  await expect(page).toHaveURL(`/checkout#pedido-${orderId}`)
  const receipt = page.getByRole('dialog', {
    name: 'Seus NFTs agora estão na sua carteira',
  })
  await expect(receipt).toBeVisible()

  const item = receipt.getByRole('listitem').filter({ hasText: 'Emerald Ape #042' })
  await expect(item).toContainText('× 2')
  await expect(receipt).toContainText('2.396 ETH')

  await page.goto('/profile?section=orders')
  await expect(page.getByRole('heading', { name: 'Minhas compras' })).toBeVisible()
  await expect(page.getByText(`Pedido ${orderId}`, { exact: true })).toHaveCount(1)
  await expect(page.getByText(/^Pedido [0-9a-f-]+$/)).toHaveCount(1)
})