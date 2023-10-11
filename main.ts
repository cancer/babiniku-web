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

  if (camera === null) return;
  if (detector === null) return;

  try {
    debug("detecting faces...");
    const faces = await detector.estimateFaces(camera.ref());
    loading.destroy(app);
    debug("face detected %o", faces);

    // render
    //const faceMeshStage = FaceMeshStage({
    //  width: videoWidth,
    //  height: videoHeight,
    //  id: "faceMeshStage",
    //  faces,
    //});
    //faceMeshStage.render(app);

    // 顔が検出できない瞬間もある
    if (faces.length === 0) return (rafId = requestAnimationFrame(loop));

    const props = {
      keypoints: faces[0].keypoints,
      model: "/mao_pro_t02.model3.json",
      timer: _timer,
      id: "stage",
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
