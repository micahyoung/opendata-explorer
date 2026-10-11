import { beforeAll } from "vitest";
import { initLocalModel } from "../src/lib/ai/localModel/engineClient";
import { useModelStatus } from "../src/lib/ai/localModel/modelStatus";

/** Loads the cached model once per file. Evals never download it: do that from the app on this origin. */
beforeAll(async () => {
  await initLocalModel();
  await new Promise<void>((resolve, reject) => {
    const check = () => {
      const { phase, message } = useModelStatus.getState();
      if (phase === "ready") return resolve();
      if (phase === "idle") return reject(new Error(`The model is not cached for ${location.origin}. Download it from the app on this origin first.`));
      if (phase === "unsupported" || phase === "error") return reject(new Error(`Model ${phase}: ${message ?? ""}`));
    };
    useModelStatus.subscribe(check);
    check();
  });
});
