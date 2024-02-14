import { createEffect, createSignal } from "solid-js";
import { Keypoint } from "../libs/face-detection.ts";
import {
  bindModelToStage,
  createModel,
  createResizer,
  render,
} from "../libs/live2d";
import AppCubismUserModel from "../libs/live2d/CubismModel.ts";
import { type ModelData } from "../libs/live2d/fetcher.ts";
import { type Timer } from "../libs/util.ts";

export const useLive2dModel = () => {
  const [keypoints, setKeypoints] = createSignal<Keypoint[]>([]);
  const [renderer, setRenderer] = createSignal<(keypoints: Keypoint[]) => void>(
    () => {},
  );
  const [model, setModel] = createSignal<AppCubismUserModel | null>(null);
  const [error, setError] = createSignal<Error | null>(null);

  // 座標が更新されたらモデルを再描画
  createEffect(() => {
    const _keypoints = keypoints();
    if (_keypoints.length === 0) return;

    renderer()(_keypoints);
  });

  const initialize = (
    stage: HTMLCanvasElement,
    params: {
      modelData: ModelData;
      position: Partial<{ x: number; y: number; z: number }>;
      timer: Timer;
    },
  ) => {
    const gl = stage.getContext("webgl");
    if (gl === null) return setError(new Error("Webgl is not available."));

    // モデルを作ってステージにバインド
    const model = createModel({
      data: params.modelData,
      position: params.position,
    });
    bindModelToStage(gl, model, params.modelData.textures, [
      0,
      0,
      stage.width,
      stage.height,
    ]);

    // モデルのサイズをステージのサイズにあわせる
    const { resize } = createResizer(model, { x: 0, y: 0, z: 3 });
    resize({
      width: stage.width,
      height: stage.height,
    });
    window.onresize = () => {
      if (stage === null) return;
      resize!({
        width: stage.width,
        height: stage.height,
      });
    };

    const _render = (keypoints: Keypoint[]) =>
      render(
        gl,
        [0, 0, stage.width, stage.height],
        model,
        keypoints,
        params.timer,
      );
    setRenderer(() => _render);
    setModel(model);

    // 初回の顔検出が遅いので、とりあえず立ち絵を描画しとく
    _render([]);
  };

  const updateKeypoints = (keypoints: Keypoint[]) => setKeypoints(keypoints);
  
  const cleanup = () => model()?.release();

  return [{ error: error() }, { initialize, updateKeypoints, cleanup }] as const;
};
