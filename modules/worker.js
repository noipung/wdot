import { state } from "./state.js";
import { DITHER_WORKER_URL, ADJUST_WORKER_URL } from "./constants.js";

const getWorker = (url) =>
  new Worker(new URL(url, import.meta.url), {
    type: "module",
  });

export const initWorkers = () => {
  state.worker.dither = getWorker(DITHER_WORKER_URL);
  state.worker.adjust = getWorker(ADJUST_WORKER_URL);
};

export function createWorkerTask(worker, dataToSend, transferableObjects) {
  return new Promise((resolve, reject) => {
    const handleMessage = (e) => {
      worker.removeEventListener("message", handleMessage);
      resolve(e.data);
    };

    const handleError = (err) => {
      worker.removeEventListener("error", handleError);
      reject(err);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    worker.postMessage(dataToSend, transferableObjects);
  });
}
