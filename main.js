import $debug from "debug";
import { provideCameraStream } from "./src/libs/camera.js";
import { provideDetector } from "./src/libs/face-detection.js";
import { Camera } from "./src/components/camera.js";
import { Live2dStage } from "./src/components/live2d-stage";
import { timer } from "./src/libs/util.js";
import { FaceMeshStage } from "./src/components/face-mesh-stage.js";
import { Loading } from "./src/components/loading.js";

import "./style.css";

const debug = $debug("app");

const videoWidth = 640;
const videoHeight = 480;
const app = document.querySelector("#app");

const renderError = (root, err) => {
  debug("Something error occurred %o.", err);
  root.innerHTML = `${err.message}`;
};

const loading = Loading();
loading.render(app);

let camera;
let detector;
try {
  debug("setting up...");
  [camera, detector] = await Promise.all([
    provideCameraStream({ width: videoWidth, height: videoHeight }).then(
      (stream) =>
        Camera({ srcObject: stream, width: videoWidth, height: videoHeight }),
    ),
    provideDetector(),
  ]);

  camera.render(app);
  debug("setup done.");
} catch (err) {
  renderError(app, err);
}

const _timer = timer();
let rafId = null;
const loop = async () => {
  if (rafId !== null) cancelAnimationFrame(rafId);

  try {
    debug("detecting faces...");
    const faces = await detector.estimateFaces(camera.ref());
    loading.destroy(app);
    debug("face detected %o", faces);

    // render
    const faceMeshStage = FaceMeshStage({
      width: videoWidth,
      height: videoHeight,
      id: "faceMeshStage",
      faces,
    });
    faceMeshStage.render(app);

    // 顔が検出できない瞬間もある
    if (faces.length === 0) return (rafId = requestAnimationFrame(loop));

    const props = {
      keypoints: faces[0].keypoints,
      timer: _timer,
      id: "stage",
    };
    const live2dStage = Live2dStage(props);
    live2dStage.render(app);
  } catch (err) {
    renderError(app, err);
    return;
  }

  rafId = requestAnimationFrame(loop);
};

await loop();
