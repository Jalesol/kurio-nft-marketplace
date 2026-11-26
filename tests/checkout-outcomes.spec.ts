import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

type Scenario = 'pending-then-confirmed' | 'declined'

async function openOrderReview(page: Page, scenario: Scenario) {
  await page.goto('/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()

  await expect(page).toHaveURL(/\/cart$/)
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
  await expect(page.getByRole('heading', { name: 'Revise seu pedido' })).toBeVisible()

  await page.evaluate((value) => {
    sessionStorage.setItem('kurio:checkout-scenario', value)
  }, scenario)
}

function receiptDialog(page: Page) {
  return page.getByRole('dialog', {
    name: 'Seus NFTs agora estão na sua carteira',
  })
}

test('mostra pedido pendente e só abre o comprovante após a confirmação', async ({ page }) => {
  test.setTimeout(60_000)
  await openOrderReview(page, 'pending-then-confirmed')

  const confirm = page.getByRole('button', { name: 'Confirmar pedido', exact: true })

  await confirm.click()
  await expect(page.getByRole('alert')).toContainText('Pedido pendente')
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(receiptDialog(page)).toHaveCount(0)

  // Verifica a resposta da interface até o mock liberar a mesma tentativa.
  await expect.poll(async () => {
    if (await receiptDialog(page).isVisible()) return true
    if (await confirm.isVisible() && await confirm.isEnabled()) {
      await confirm.click()
    }
    return await receiptDialog(page).isVisible()
  }, {
    timeout: 10_000,
    intervals: [500, 1_000],
  }).toBe(true)

  await expect(page).toHaveURL(/\/checkout#pedido-[0-9a-f-]+$/)
  const orderId = new URL(page.url()).hash.slice('#pedido-'.length)
  const receipt = receiptDialog(page)
  const item = receipt.getByRole('listitem').filter({ hasText: 'Emerald Ape #042' })

  await expect(item).toContainText('× 2')
  await expect(receipt).toContainText('2.396 ETH')

  await page.goto('/profile?section=orders')
  await expect(page.getByRole('heading', { name: 'Minhas compras' })).toBeVisible()
  await expect(page.getByText(`Pedido ${orderId}`, { exact: true })).toHaveCount(1)
  await expect(page.getByText(/^Pedido [0-9a-f-]+$/)).toHaveCount(1)
})

test('mostra pagamento recusado e mantém os itens no carrinho', async ({ page }) => {
  test.setTimeout(60_000)
  await openOrderReview(page, 'declined')

  const confirm = page.getByRole('button', { name: 'Confirmar pedido', exact: true })

  await confirm.click()
  await expect(page.getByRole('alert')).toContainText(
    'Pagamento recusado. Seus itens continuam no carrinho.',
  )
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(receiptDialog(page)).toHaveCount(0)

  await page.goto('/cart')
  const cart = page.getByRole('region', { name: 'Itens do carrinho' })
  const item = cart.getByRole('listitem').filter({ hasText: 'Emerald Ape #042' })

  await expect(item).toBeVisible()
  await expect(item.getByRole('group', { name: /Quantidade de Emerald Ape/ }))
    .toHaveText('2')
  await expect(item).toContainText('2.38 ETH')

  await page.goto('/profile?section=orders')
  await expect(page.getByText('Você ainda não tem compras confirmadas.')).toBeVisible()
})