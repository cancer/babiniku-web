import {
  createMemo,
  createResource,
  onCleanup,
  Show,
  type VoidComponent,
} from "solid-js";
import { Live2dStage } from "./components/live2d-stage.tsx";
import { Loading } from "./components/loading.tsx";
import { provideCameraStream } from "./libs/camera.ts";
import { provideDetector } from "./libs/face-detection.ts";
import { fetchModelData } from "./libs/live2d/fetcher.ts";
import { timer as _timer } from "./libs/util.ts";

export const App: VoidComponent = () => {
  const [modelData] = createResource(
    "/mao_pro_t02.model3.json",
    fetchModelData,
  );
  const [cameraStream] = createResource(() =>
    provideCameraStream({ width: 640, height: 480 }),
  );
  const [detector] = createResource(() => provideDetector());

  const timer = createMemo(() => _timer());

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

  const loading = createMemo(() => {
    if (modelData.loading) return true;
    if (cameraStream.loading) return true;
    if (detector.loading) return true;
    return false;
  });

  onCleanup(() => detector()!.dispose());

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
            const _detector = detector();
            if (_detector === undefined) return [];
            const _camera = cameraRef();
            if (_camera === null) return [];

            const faces = await _detector.estimateFaces(_camera);
            if (faces.length === 0) return [];
            return faces[0].keypoints;
          }}
        />
      )}
    </Show>
  );
};
