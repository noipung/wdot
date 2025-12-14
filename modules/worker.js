import { state } from "./state.js";

import AdjustWorker from "../workers/adjust.worker.js?worker";
import DitherWorker from "../workers/dither.worker.js?worker";

const workersMap = {
  adjust: AdjustWorker,
  dither: DitherWorker,
};

export const getWorker = (key) => new workersMap[key]();

export const resetWorker = (key) => {
  const currentWorker = state.workers[key];

  if (!currentWorker?.instance) {
    state.workers[key] = {
      instance: getWorker(key),
      isProcessing: false,
    };
    return;
  }

  if (!currentWorker.isProcessing) return;

  currentWorker.instance.terminate();
  state.workers[key] = {
    instance: getWorker(key),
    isProcessing: false,
  };
};

export const resetAllWorkers = () =>
  Object.keys(state.workers).forEach(resetWorker);

export function createWorkerTask(worker, dataToSend, transferableObjects, onProgress) {
  return new Promise((resolve, reject) => {
    const handleMessage = (e) => {
      const { type } = e.data;
      
      if (type === 'progress' && onProgress) {
        onProgress(e.data.percentage);
        return; // 진행률 메시지는 계속 리스닝
      }
      
      if (type === 'result') {
        worker.removeEventListener("message", handleMessage);
        resolve(e.data);
      }
    };

    const handleError = (err) => {
      worker.removeEventListener("error", handleError);
      worker.removeEventListener("message", handleMessage);
      reject(err);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    worker.postMessage(dataToSend, transferableObjects);
  });
}
