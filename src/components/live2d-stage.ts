import type { Face } from "@tensorflow-models/face-detection";
import { ModelData } from "../libs/live2d/fetcher.ts";
import { bindModelToStage, createModel, initializeCubism, render } from "../libs/live2d/index";
import { createStage } from "../libs/stage";
import type { Timer } from "../libs/util.ts";

type Props = {
  timer: Timer;
  id: string;
  modelData: ModelData;
  estimateFaces: () => Promise<Face[]>;
};
export const Live2dStage = ({
  timer,
  id,
  modelData,
  estimateFaces,
}: Props) => {
  // 描画ステージの作成
  const { canvas: el, gl } = createStage({
    id,
    width: 1280,
    height: 960,
  });
  const viewport = [0, 0, el.width, el.height];

  initializeCubism();

  estimateFaces().then((faces) => {
    // 顔が検出できてない
    if (faces.length === 0) return;

    // Live2dモデルをつくって
    const { model, resize } = createModel({
      data: modelData,
      position: { z: 3 },
    });
    // それをWebGLにバインド
    if (model.getRenderer() === null) {
      bindModelToStage(gl, model, modelData.textures, viewport);
      resize({ width: el.width, height: el.height });
      window.onresize = () => resize({ width: el.width, height: el.height });
    }

    // 検出した顔に合わせてモデルを動かす
    render(gl, viewport, model, faces[0].keypoints, timer);
  });

  return {
    render(app: HTMLElement) {
      const currentStage = app.querySelector(`#${id}`);
      if (currentStage) app.replaceChild(el, currentStage);
      else app.appendChild(el);
    },
  };
};
