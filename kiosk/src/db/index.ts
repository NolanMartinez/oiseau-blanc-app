// Sélection de l'implémentation Repo selon la plateforme + singleton.
import { isTauri } from "../platform/env";
import type { Repo } from "./repo";

let repoPromise: Promise<Repo> | null = null;

export function getRepo(): Promise<Repo> {
  if (!repoPromise) {
    repoPromise = (async () => {
      const repo: Repo = isTauri()
        ? new (await import("./sqlRepo")).SqlRepo()
        : new (await import("./memoryRepo")).MemoryRepo();
      await repo.init();
      return repo;
    })();
  }
  return repoPromise;
}

export type { Repo, LockerMapping, DishImage } from "./repo";
export * from "./types";
