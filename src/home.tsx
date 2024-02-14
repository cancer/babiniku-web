import {
  createMemo,
  createResource,
  Show,
  type VoidComponent,
} from "solid-js";
import { Live2dStage } from "./components/live2d-stage.tsx";
import { Loading } from "./components/loading.tsx";
import { provideCameraStream } from "./libs/camera.ts";
import { Keypoint, provideLandMarker } from "./libs/face-detection.ts";
import { fetchModelData } from "./libs/live2d/fetcher.ts";
import { timer as _timer } from "./libs/util.ts";

export const Home: VoidComponent = () => {
  const [modelData] = createResource(
    "/mao_pro_t02.model3.json",
    fetchModelData,
  );
  const timer = createMemo(() => _timer());

  const [cameraStream] = createResource(() =>
    provideCameraStream({ width: 640, height: 480 }),
  );
  const cameraRef = createMemo(() => {
    if (cameraStream.state !== "ready") return null;
    const camera = cameraStream();
    const el = document.createElement("video");
    el.srcObject = camera;
    el.play();
    el.width = 640;
    el.height = 480;
    return el;
  });

  const [faceLandMarker] = createResource(() => provideLandMarker());

  const loading = createMemo(() => {
    if (modelData.state !== "ready") return false;
    if (cameraStream.state !== "ready") return false;
    if (faceLandMarker.state !== "ready") return false;
    return false;
  });

  let lastVideoTime = -1;
  return (
    <Show
      when={!loading() && modelData()}
      fallback={<Loading message="Initializing app..." />}
    >
      {(data) => (
        <Live2dStage
          timer={timer()}
          modelData={data()}
          acquireFaceRandMark={async () => {
            const camera = cameraRef();
            if (camera === null) return [];
            const _faceLandMarker = faceLandMarker();
            if (_faceLandMarker === undefined) return [];
            if (lastVideoTime === camera.currentTime) return [];

            const result = _faceLandMarker.detectForVideo(camera, Date.now());
            lastVideoTime = camera.currentTime;
            
            if (result.faceLandmarks.length === 0) return [];
            return result.faceLandmarks[0] as Keypoint[];
          }}
        />
      )}
    </Show>
  );
};
