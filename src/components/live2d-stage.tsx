import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
  VoidComponent,
} from "solid-js";
import { Keypoint } from "../libs/face-detection.ts";
import { ModelData } from "../libs/live2d/fetcher.ts";
import { disposeCubism, initializeCubism } from "../libs/live2d/index";
import type { Timer } from "../libs/util.ts";
import { PerfMonitor } from "./monitor.tsx";
import { useLive2dModel } from "./use-live2d-model.ts";

type Props = {
  timer: Timer;
  modelData: ModelData;
  acquireFaceRandMark: () => Promise<Keypoint[]>;
};

export const Live2dStage: VoidComponent<Props> = (props) => {
  // Cubism Frameworkの初期化
  // modelを使ったりする前に読み込まなければいけない
  initializeCubism();

  const [stageRef, setStageRef] = createSignal<HTMLCanvasElement | null>(null);
  const [{ error }, { initialize, updateKeypoints, cleanup }] =
    useLive2dModel();

  // モデルを初期化してWebGLにバインド
  createEffect(() => {
    const stage = stageRef();
    if (stage === null) return;

    initialize(stage, {
      modelData: props.modelData,
      position: { z: 3 },
      timer: props.timer,
    });
  });

  // 毎フレーム顔を検出して座標を更新
  createEffect(() => {
    const loop = () => {
      rafId = requestAnimationFrame(() => loop());
      props
        .acquireFaceRandMark()
        .then((keypoints) => updateKeypoints(keypoints));
    };

    let rafId = requestAnimationFrame(() => loop());
    onCleanup(() => cancelAnimationFrame(rafId));
  });

  onCleanup(() => {
    cleanup();
    disposeCubism();
  });

  return (
    <>
      <Show when={error}>{(err) => <div>{err().message}</div>}</Show>
      <PerfMonitor canvas={stageRef()!} />
      <canvas ref={setStageRef} width="1280" height="960" />
    </>
  );
};
