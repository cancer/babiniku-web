import type { Keypoint } from "@tensorflow-models/face-detection";
import { createEffect, createMemo, onCleanup, VoidComponent } from "solid-js";
import { ModelData } from "../libs/live2d/fetcher.ts";
import {
  bindModelToStage,
  createModel,
  createResizer,
  initializeCubism,
  render,
} from "../libs/live2d/index";
import type { Timer } from "../libs/util.ts";

type Props = {
  timer: Timer;
  modelData: ModelData;
  acquireFaceRandMark: () => Promise<Keypoint[]>;
};

export const Live2dStage: VoidComponent<Props> = (props) => {
  // Cubism Frameworkの初期化
  // modelを使ったりする前に読み込まなければいけない
  initializeCubism();

  let stage: HTMLCanvasElement;
  const model = createMemo(() =>
    createModel({
      data: props.modelData,
      position: { z: 3 },
    }),
  );
  const resizer = createMemo(() =>
    createResizer(model(), { x: 0, y: 0, z: 3 }),
  );

  // モデルをWebGLにバインド
  createEffect(() => {
    if (stage === undefined) return;
    const gl = stage.getContext("webgl");
    if (gl === null) throw new Error("WebGL is not available.");

    bindModelToStage(gl, model(), props.modelData.textures, [
      0,
      0,
      stage.width,
      stage.height,
    ]);
    resizer().resize({
      width: stage.width,
      height: stage.height,
    });
    window.onresize = () => {
      if (stage === null) return;
      resizer().resize({
        width: stage.width,
        height: stage.height,
      });
    };
  });

  // 毎フレーム顔を検出してモデルを動かす
  createEffect(() => {
    if (stage === undefined) return;
    const gl = stage.getContext("webgl");
    if (gl === null) throw new Error("WebGL is not available.");

    const loop = async () => {
      rafId = requestAnimationFrame(async () => await loop());
      const keypoints = await props.acquireFaceRandMark();
      if (keypoints.length === 0) return;
      render(
        gl,
        [0, 0, stage.width, stage.height],
        model(),
        keypoints,
        props.timer,
      );
    };

    let rafId = requestAnimationFrame(async () => await loop());
    onCleanup(() => cancelAnimationFrame(rafId));
  });

  return <canvas ref={stage!} width="1280" height="960" />;
};
