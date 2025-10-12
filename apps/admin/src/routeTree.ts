// No need to import these since we're not using them directly
import { rootRoute } from './routes/__root'
import { indexRoute } from './routes/index'
import { analyticsRoute } from './routes/analytics/index'

const routeTree = rootRoute.addChildren([indexRoute, analyticsRoute])

export { routeTree }
