import type { Face } from "@tensorflow-models/face-detection";
import { bindModelToStage, render } from "../libs/live2d/index";
import { fetchModelData } from "../libs/live2d/fetcher.ts";
import { createStage } from "../libs/live2d/stage.js";
import type { Timer } from "../libs/util.ts";

type Props = {
  timer: Timer;
  id: string;
  model: string;
  estimateFaces: () => Promise<Face[]>;
  modelLoaded: () => void;
};
export const Live2dStage = ({
  timer,
  id,
  model,
  estimateFaces,
  modelLoaded,
}: Props) => {
  // 描画ステージの作成
  const { canvas: el, gl } = createStage({
    id,
    width: 1280,
    height: 960,
  });
  const viewport = [0, 0, el.width, el.height];

  fetchModelData(model)
    .then(({ modelSetting, ...binaries }) =>
      // Live2dモデルをWebGLのステージにバインド
      bindModelToStage(el, viewport, modelSetting, binaries, {
        autoBlink: false,
        x: 0,
        y: 0,
        scale: 3,
      }),
    )
    .then(({ model: modelContainer }) =>
      // face detectionの結果に応じてモデルを動かす
      estimateFaces().then((faces) => {
        modelLoaded();
        // 顔が検出できてない
        if (faces.length === 0) return;
        return render(gl, viewport, modelContainer, faces[0].keypoints, timer);
      }),
    );

  return {
    render(app: HTMLElement) {
      const currentStage = app.querySelector(`#${id}`);
      if (currentStage) app.replaceChild(el, currentStage);
      else app.appendChild(el);
    },
  };
};
