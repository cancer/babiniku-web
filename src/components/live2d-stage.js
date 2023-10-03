import { bindModelToStage, render } from "../libs/live2d/index";
import { fetchModelData } from "../libs/live2d/fetcher.js";
import { createStage } from "../libs/live2d/stage.js";

export const Live2dStage = ({ keypoints, timer, id }) => {
  // 描画ステージの作成
  const { canvas: el, gl } = createStage({
    id,
    width: 1280,
    height: 960,
  });
  const viewport = [0, 0, el.width, el.height];

  fetchModelData("/mao_pro_t02.model3.json")
    .then(({ modelSetting, ...binaries }) =>
      // Live2dモデルをWebGLのステージにバインド
      bindModelToStage(el, viewport, modelSetting, binaries, {
        autoBlink: false,
        x: 0,
        y: 0,
        scale: 3,
      }),
    )

    .then(({model: modelContainer}) =>
      // face detectionの結果に応じてモデルを動かす
      render(gl, viewport, modelContainer, keypoints, timer),
    );

  return {
    render(app) {
      const currentStage = app.querySelector(`#${id}`);
      if (currentStage) app.replaceChild(el, currentStage);
      else app.appendChild(el);
    },
  };
};
