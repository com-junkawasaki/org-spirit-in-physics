import { createTRPCReact } from '@trpc/react-query';
import { AppRouter } from '../server/api/root';

/**
 * tRPC React クライアント
 */
export const trpc = createTRPCReact<AppRouter>();

