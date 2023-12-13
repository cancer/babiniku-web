import type { Keypoint } from "@tensorflow-models/face-detection";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  Show,
  VoidComponent,
} from "solid-js";
import { ModelData } from "../libs/live2d/fetcher.ts";
import {
  bindModelToStage,
  createModel,
  createResizer,
  initializeCubism,
  render,
} from "../libs/live2d/index";
import type { Timer } from "../libs/util.ts";
import { Loading } from "./loading.tsx";

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
  const gl = createMemo(() => stageRef()?.getContext("webgl") ?? null);

  const model = createMemo(() =>
    createModel({
      data: props.modelData,
      position: { z: 3 },
    }),
  );
  const resizer = createMemo(() =>
    createResizer(model(), { x: 0, y: 0, z: 3 }),
  );

  const [keypoints, { refetch: refetchKeypoints }] = createResource(() =>
    props.acquireFaceRandMark(),
  );

  // モデルをWebGLにバインド
  createEffect(() => {
    const _stage = stageRef();
    if (_stage === null) return;
    const _gl = gl();
    if (_gl === null) return;

    bindModelToStage(_gl, model(), props.modelData.textures, [
      0,
      0,
      _stage.width,
      _stage.height,
    ]);
    resizer().resize({
      width: _stage.width,
      height: _stage.height,
    });
    // 初回の検出が遅いので、とりあえず立ち絵をレンダリング
    render(_gl, [0, 0, _stage.width, _stage.height], model(), [], props.timer);

    window.onresize = () => {
      if (_stage === null) return;
      resizer().resize({
        width: _stage.width,
        height: _stage.height,
      });
    };
  });

  // 毎フレーム顔を検出して座標を更新
  createEffect(() => {
    const loop = () => {
      rafId = requestAnimationFrame(() => loop());
      if (keypoints.state !== "ready") return;
      refetchKeypoints();
    };

    let rafId = requestAnimationFrame(() => loop());
    onCleanup(() => cancelAnimationFrame(rafId));
  });

  // 座標が更新されたらモデルを再描画
  createEffect(() => {
    const _stage = stageRef();
    if (_stage === null) return;
    const _gl = gl();
    if (_gl === null) return;
    const _keypoints = keypoints();
    if (!_keypoints) return;
    if (_keypoints.length === 0) return;

    render(
      _gl,
      [0, 0, _stage.width, _stage.height],
      model(),
      _keypoints,
      props.timer,
    );
  });

  return (
    <>
      <Show when={keypoints.state !== "ready" && keypoints.state !== "refreshing"}>
        <Loading message="Detecting face landmark..." />
      </Show>
      <canvas ref={setStageRef} width="1280" height="960" />
    </>
  );
};
