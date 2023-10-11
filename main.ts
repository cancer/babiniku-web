import { FaceLandmarksDetector } from "@tensorflow-models/face-landmarks-detection/dist/face_landmarks_detector";
import $debug from "debug";
import { provideCameraStream } from "./src/libs/camera.js";
import { provideDetector } from "./src/libs/face-detection.js";
import { Camera } from "./src/components/camera.js";
import { Live2dStage } from "./src/components/live2d-stage.ts";
import { timer } from "./src/libs/util.js";
import { Loading } from "./src/components/loading.js";

import "./style.css";

const debug = $debug("app");

const videoWidth = 640;
const videoHeight = 480;
const app = document.querySelector<HTMLElement>("#app");
if (app === null) throw new Error("Failed to find root element.");

const renderError = (root: HTMLElement, err: Error) => {
  debug("Something error occurred %o.", err);
  root.innerHTML = `${err.message}`;
};

const loading = Loading();
loading.render(app);

let camera: { ref(): HTMLVideoElement; render(app: HTMLElement): void } | null =
  null;
let detector: FaceLandmarksDetector | null = null;
try {
  debug("setting up...");
  [camera, detector] = await Promise.all([
    provideCameraStream({ width: videoWidth, height: videoHeight }).then(
      (stream) =>
        Camera({ srcObject: stream, width: videoWidth, height: videoHeight }),
    ),
    provideDetector(),
  ]);

  //camera.render(app);
  debug("setup done.");
} catch (err) {
  renderError(app, err as Error);
}

const _timer = timer();
let rafId: number | null = null;
const loop = async () => {
  if (rafId !== null) cancelAnimationFrame(rafId);

  try {
    const props = {
      model: "/mao_pro_t02.model3.json",
      timer: _timer,
      id: "stage",
      estimateFaces: () => {
        if (camera === null) return Promise.resolve([]);
        if (detector === null) return Promise.resolve([]);
        return detector.estimateFaces(camera.ref());
      },
      modelLoaded: () => loading.destroy(app),
    };
    const live2dStage = Live2dStage(props);
    live2dStage.render(app);
  } catch (err) {
    renderError(app, err as Error);
    return;
  }

  rafId = requestAnimationFrame(loop);
};

await loop();
