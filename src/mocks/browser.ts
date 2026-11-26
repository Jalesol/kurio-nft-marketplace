import { setupWorker } from 'msw/browser'
import { accountHandlers } from './accountHandlers'
import { checkoutOutcomeHandlers } from './checkoutOutcomeHandlers'
import { checkoutSocketHandler } from './checkoutSocket.ts'
import { handlers } from './handlers'

export const worker = setupWorker(
  ...accountHandlers,
  ...checkoutOutcomeHandlers,
  ...handlers,
  checkoutSocketHandler,
)