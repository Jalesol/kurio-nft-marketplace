import { expect, test } from '@playwright/test'

test('atualiza a cotação após nft.updated e rejeita a revisão antiga', async ({ page }) => {
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

  const summary = page.getByRole('complementary', { name: 'Resumo do pagamento' })
  await expect(summary).toContainText('2.396 ETH')

  const updateResponse = await page.evaluate(async () => {
    const response = await fetch('/api/mock/nfts/emerald-ape-042/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceEth: '1.49', availableSupply: 2 }),
    })
    return response.status
  })

  expect(updateResponse).toBe(200)
  await expect(page.getByText('O preço ou estoque de um NFT mudou.', { exact: false }))
    .toBeVisible()

  const [confirmation] = await Promise.all([
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/checkout/orders' &&
      response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Confirmar pedido', exact: true }).click(),
  ])

  expect(confirmation.status()).toBe(409)
  await expect(page.getByRole('alert')).toContainText('O carrinho mudou')
  await expect(page.getByRole('dialog', { name: 'Seus NFTs agora estão na sua carteira' }))
    .toHaveCount(0)
  await expect(summary).toContainText('2.996 ETH')

  await page.goto('/cart')
  const item = page.getByRole('listitem').filter({ hasText: 'Emerald Ape #042' }).first()
  await expect(item).toContainText('1.49 ETH')
  await expect(item).toContainText('2.98 ETH')
  await expect(item.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
})