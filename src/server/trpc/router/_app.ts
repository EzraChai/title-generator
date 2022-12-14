import { router } from "../trpc";
import { generateRouter } from "./generator";

export const appRouter = router({
  generate: generateRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
