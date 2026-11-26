import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const nftPath = '/nfts/emerald-ape-042'
const demoEmail = 'colecionador@kurio.test'
const demoPassword = 'KurioDemo123'
const walletAddress = '0x1111111111111111111111111111111111111111'

function authDialog(page: Page) {
  return page.getByRole('dialog', { name: 'Acesso à Kurio' })
}

function apiResponse(page: Page, method: string, path: string) {
  return page.waitForResponse((response) =>
    response.request().method() === method &&
    new URL(response.url()).pathname === path,
  )
}

async function login(page: Page, password = demoPassword) {
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  const form = authDialog(page)
  await form.getByLabel('E-mail', { exact: true }).fill(demoEmail)
  await form.getByLabel('Senha', { exact: true }).fill(password)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(form).toBeHidden()
  await expect(page.getByRole('link', { name: 'Minha conta', exact: true })).toBeVisible()
}

async function addNft(page: Page) {
  await page.goto(nftPath)
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(page).toHaveURL(/\/cart(?:[?#].*)?$/)
}

test('cadastra uma conta, rejeita cadastro duplicado e protege o perfil após expiração', async ({ page }) => {
  await page.goto('/')

  async function register() {
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const form = authDialog(page)
    await form.getByRole('tab', { name: 'Criar conta', exact: true }).click()
    await form.getByLabel('Nome de usuário', { exact: true }).fill('kurioe2e')
    await form.getByLabel('E-mail', { exact: true }).fill('kurioe2e@kurio.test')
    await form.getByLabel('Senha', { exact: true }).fill(demoPassword)
    await form.getByLabel('Confirmar senha', { exact: true }).fill(demoPassword)

    const response = apiResponse(page, 'POST', '/api/checkout/register')
    await form.getByRole('button', { name: 'Criar conta', exact: true }).click()
    return response
  }

  expect((await register()).ok()).toBe(true)
  await page.getByRole('link', { name: 'Minha conta', exact: true }).click()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()

  expect((await register()).status()).toBe(409)
  await expect(authDialog(page).getByRole('alert')).toBeVisible()
  await page.keyboard.press('Escape')

  await login(page)
  await page.evaluate(() => {
    const key = 'kurio:checkout-session'
    const stored = sessionStorage.getItem(key)
    if (!stored) throw new Error('Sessão simulada não encontrada')
    sessionStorage.setItem(key, JSON.stringify({ ...JSON.parse(stored), expiresAt: 0 }))
  })
  await page.goto('/profile')
  await expect(page.getByText(/Use o botão.*Entrar.*cabeçalho/i)).toBeVisible()
  await expect(page.getByLabel('Nome de exibição')).toHaveCount(0)
})

test('atualiza quantidades, valida cupons e preserva o carrinho após F5 e login', async ({ page }) => {
  await addNft(page)

  const items = page.getByRole('region', { name: 'Itens do carrinho' })
  const quantity = items.getByLabel(/Quantidade de Emerald Ape/)
  await expect(quantity).toHaveText('1')
  await items.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(quantity).toHaveText('2')

  const coupon = page.getByLabel('Código promocional')
  const apply = page.getByRole('button', { name: 'Aplicar', exact: true })
  for (const [code, message] of [
    ['INVALIDO', /inválido/i],
    ['EXPIRADO', /expirou/i],
  ] as const) {
    await coupon.fill(code)
    const response = apiResponse(page, 'PUT', '/api/cart/coupon')
    await apply.click()
    expect((await response).status()).toBe(422)
    await expect(page.locator('#cart-coupon-error')).toHaveText(message)
  }

  await coupon.fill('KURIO10')
  await apply.click()
  await expect(page.getByText('Cupom KURIO10 aplicado.')).toBeVisible()
  await page.reload()
  await expect(quantity).toHaveText('2')
  await expect(page.getByText('Cupom KURIO10 aplicado.')).toBeVisible()

  await login(page)
  await expect(quantity).toHaveText('2')
  await page.getByRole('button', { name: 'Remover cupom', exact: true }).click()
  await expect(page.getByText('Cupom KURIO10 aplicado.')).toHaveCount(0)
  await items.getByRole('button', { name: 'Diminuir quantidade' }).click()
  await expect(quantity).toHaveText('1')
  await items.getByRole('button', { name: /Remover Emerald Ape/ }).click()
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
})

test('edita perfil, avatar, senha e carteiras e valida endereço inválido', async ({ page }) => {
  await page.goto('/')
  await login(page)
  await page.getByRole('link', { name: 'Minha conta', exact: true }).click()

  await page.getByLabel('Nome de exibição').fill('Colecionador E2E')
  await page.getByLabel('Nome ENS', { exact: false }).fill('colecionadore2e')
  await page.getByLabel('Apelido da carteira').fill('Carteira de teste')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(page.locator('img[src^="data:image/png;base64,"]')).toBeVisible()

  const newPassword = 'KurioNovo123'
  await page.getByLabel('Senha atual', { exact: true }).fill(demoPassword)
  await page.getByLabel('Nova senha', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill(newPassword)

  const profileSaved = apiResponse(page, 'PUT', '/api/account/profile')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  expect((await profileSaved).ok()).toBe(true)
  await page.reload()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Colecionador E2E')
  await expect(page.locator('img[src^="data:image/png;base64,"]')).toBeVisible()

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await login(page, newPassword)
  await page.getByRole('link', { name: 'Minha conta', exact: true }).click()
  await page.getByRole('link', { name: 'Carteiras', exact: true }).click()

  const primary = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Carteira principal', exact: true }),
  })
  const secondary = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Carteira secundária', exact: true }),
  })

  await primary.getByLabel('Apelido da carteira').fill('Principal E2E')
  await primary.getByLabel('Tipo de carteira').selectOption('MetaMask')
  await primary.getByLabel('Rede').selectOption('Ethereum')
  const address = primary.getByLabel('Endereço da carteira')
  await address.fill('endereco-invalido')
  const invalid = apiResponse(page, 'PUT', '/api/account/wallets/primary')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  expect((await invalid).status()).toBe(400)
  await expect(primary.getByRole('alert')).toBeVisible()

  await address.fill(walletAddress)
  const saved = apiResponse(page, 'PUT', '/api/account/wallets/primary')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  expect((await saved).ok()).toBe(true)

  await secondary.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await secondary.getByLabel('Apelido da carteira').fill('Secundária E2E')
  await secondary.getByLabel('Tipo de carteira').selectOption('WalletConnect')
  await secondary.getByLabel('Rede').selectOption('Polygon')
  await secondary.getByLabel('Endereço da carteira').fill(walletAddress)
  const secondarySaved = apiResponse(page, 'PUT', '/api/account/wallets/secondary')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  expect((await secondarySaved).ok()).toBe(true)

  await page.reload()
  await expect(primary.getByLabel('Endereço da carteira')).toHaveValue(walletAddress)
  await expect(secondary.getByLabel('Apelido da carteira')).toHaveValue('Secundária E2E')
})

test('confirma apenas um pedido após cliques repetidos', async ({ page }) => {
  await addNft(page)
  await login(page)
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()

  const form = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Perfil do colecionador' }),
  })
  await form.getByLabel('Nome de exibição').fill('Colecionador E2E')
  await form.getByLabel('Nome de usuário').fill('colecionadore2e')
  await form.getByLabel('Nome do perfil').fill('Coleção de teste')
  await form.locator('select[name="network"]').selectOption('Ethereum')
  await form.getByLabel('Endereço da carteira').fill(walletAddress)
  await form.getByLabel('Tipo de carteira').selectOption('Extensão')
  await form.getByLabel('Código de indicação').fill('DEMO')
  await form.getByLabel('Nome ENS').fill('colecionadore2e')
  await page.getByRole('radio', { name: 'MetaMask', exact: true }).check()
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()

  const confirm = page.getByRole('button', { name: 'Confirmar pedido', exact: true })
  await confirm.dblclick()
  await expect(page.getByRole('dialog', {
    name: 'Seus NFTs agora estão na sua carteira',
  })).toBeVisible()

  const id = new URL(page.url()).hash.slice('#pedido-'.length)
  expect(id).toMatch(/^[0-9a-f-]+$/i)
  await page.goto('/profile?section=orders')
  await expect(page.getByText(`Pedido ${id}`, { exact: true })).toHaveCount(1)
  await expect(page.getByText(/^Pedido [0-9a-f-]+$/i)).toHaveCount(1)
})

test('abre e fecha o login pelo teclado, mantém o foco e valida o campo obrigatório', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Entrar', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = authDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(':focus')).toHaveCount(1)

  await page.keyboard.press('Tab')
  await expect(dialog.locator(':focus')).toHaveCount(1)

  await dialog.getByRole('button', { name: 'Entrar', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByLabel('E-mail', { exact: true })).toBeFocused()
  await expect(dialog.locator('input[type="email"]:invalid')).toHaveCount(1)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('mostra skeletons durante lentidão e recupera o catálogo após erro', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('kurio:catalog-fail-once', '1'))

  const failed = apiResponse(page, 'GET', '/api/nfts')
  await page.goto('/')
  const catalog = page.getByRole('region', { name: 'Catálogo de NFTs' })
  await expect(catalog.getByRole('status')).toHaveText('Carregando NFTs…')
  await expect(catalog.locator('[class*="catalog-shimmer"]').first()).toBeVisible()
  expect((await failed).status()).toBe(503)
  await expect(catalog.getByRole('alert')).toHaveText('Não foi possível atualizar o catálogo.')

  const recovered = apiResponse(page, 'GET', '/api/nfts')
  await catalog.getByRole('button', { name: 'Tentar novamente' }).click()
  expect((await recovered).status()).toBe(200)
  await expect(catalog.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
  await expect(catalog.getByRole('alert')).toHaveCount(0)
})
