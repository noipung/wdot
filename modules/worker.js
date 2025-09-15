import { state } from "./state.js";

const getWorker = (url) =>
  new Worker(new URL(url, import.meta.url), {
    type: "module",
  });

const resetWorker = (key) => {
  const currentWorker = state.workers[key];

  if (!currentWorker.instance) {
    state.workers[key] = {
      instance: getWorker(`../workers/${key}.worker.js`),
      isProcessing: false,
    };
    return;
  }

  if (!currentWorker.isProcessing) return;

  currentWorker.instance.terminate();
  state.workers[key] = {
    instance: getWorker(`../workers/${key}.worker.js`),
    isProcessing: false,
  };
};

export const resetAllWorkers = () =>
  Object.keys(state.workers).forEach(resetWorker);

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
