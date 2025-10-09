import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { rootRoute } from './routes/__root'
import { indexRoute } from './routes/index'
import { analyticsRoute } from './routes/analytics/index'
import { temporalRoute } from './routes/temporal/index'

const routeTree = rootRoute.addChildren([indexRoute, analyticsRoute, temporalRoute])

export { routeTree }
