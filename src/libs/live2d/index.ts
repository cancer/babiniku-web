import $debug from "debug";
import { Keypoint } from "@tensorflow-models/face-detection";
import { calcFace, stabilizeBlink } from "../face-detection.js";
import { getLerp } from "../util.js";
import AppCubismUserModel from "./CubismModel";
import {
  CubismEyeBlink,
  CubismFramework,
  CubismMatrix44,
  CubismModelSettingJson,
} from "./Live2dSDK";

interface AvatarArrayBuffers {
  moc3: ArrayBuffer;
  textures: Blob[];
  physics: ArrayBuffer;
}
interface Live2dRendererOption {
  autoBlink: boolean;
  x: number;
  y: number;
  scale: number;
}
const DEFAULT_OPTION: Live2dRendererOption = {
  autoBlink: true,
  x: 0,
  y: 0,
  scale: 1,
};

const debug = $debug("app:live2d");
const modelCache = new Map();

export const bindModelToStage = async (
  canvas: HTMLCanvasElement,
  viewport: number[],
  modelSetting: CubismModelSettingJson,
  buffers: AvatarArrayBuffers,
  options: Partial<Live2dRendererOption> = {},
) => {
  const modelName = modelSetting.getModelFileName();
  const cachedModel = modelCache.get(modelName);
  if (cachedModel !== undefined) {
    debug("modelCache hit %o", cachedModel);
    return { model: cachedModel };
  }

  debug("bindModelToStage()");

  /**
   * WebGLコンテキストの初期化
   */

  const gl = canvas.getContext("webgl");
  if (gl === null) throw new Error("WebGL未対応のブラウザです。");

  const option = Object.assign({}, DEFAULT_OPTION, options);

  // フレームバッファを用意
  const frameBuffer: WebGLFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);

  /**
   * Frameworkの初期化
   */
  CubismFramework.startUp();
  CubismFramework.initialize();

  // const modelSetting = new CubismModelSettingJson(
  //   _model,
  //   _model.byteLength,
  // ) as ICubismModelSetting;

  const {
    moc3: moc3ArrayBuffer,
    textures,
    physics: physics3ArrayBuffer,
  } = buffers;
  /**
   * Live2Dモデルの作成と設定
   */

  const model = new AppCubismUserModel();
  // モデルデータをロード
  model.loadModel(moc3ArrayBuffer);
  // レンダラの作成（bindTextureより先にやっておく）
  model.createRenderer();
  // テクスチャをレンダラに設定
  let i = 0;
  for (let buffer of textures) {
    const texture = await createTexture(buffer, gl);
    model.getRenderer().bindTexture(i, texture);
    i++;
  }
  // そのほかレンダラの設定
  model.getRenderer().setIsPremultipliedAlpha(true);
  model.getRenderer().startUp(gl);

  // 自動目ぱち設定
  if (option.autoBlink) {
    model.setEyeBlink(CubismEyeBlink.create(modelSetting));
  }

  // モーションに適用する目ぱち用IDを設定
  for (
    let i = 0, len = modelSetting.getEyeBlinkParameterCount();
    i < len;
    i++
  ) {
    model.addEyeBlinkParameterId(modelSetting.getEyeBlinkParameterId(i));
  }
  // モーションに適用する口パク用IDを設定
  for (let i = 0, len = modelSetting.getLipSyncParameterCount(); i < len; i++) {
    model.addLipSyncParameterId(modelSetting.getLipSyncParameterId(i));
  }
  // 物理演算設定
  model.loadPhysics(physics3ArrayBuffer, physics3ArrayBuffer.byteLength);
  /**
   * Live2Dモデルのサイズ調整
   */
  const defaultPosition = Object.assign(
    {
      x: 0,
      y: 0,
      z: 1,
    },
    {
      x: option.x,
      y: option.y,
      z: option.scale,
    },
  );
  const projectionMatrix = new CubismMatrix44();
  const resizeModel = () => {
    canvas.width = (canvas.clientWidth | canvas.width) * devicePixelRatio;
    canvas.height = (canvas.clientHeight | canvas.height) * devicePixelRatio;

    // NOTE: modelMatrixは、モデルのユニット単位での幅と高さが1×1に収まるように縮めようとしている？
    const modelMatrix = model.getModelMatrix();
    modelMatrix.bottom(0);
    modelMatrix.centerY(-1);
    modelMatrix.translateY(-1);
    projectionMatrix.loadIdentity();
    const canvasRatio = canvas.height / canvas.width;
    if (1 < canvasRatio) {
      // モデルが横にはみ出る時は、HTMLキャンバスの幅で合わせる
      modelMatrix.scale(1, canvas.width / canvas.height);
    } else {
      // モデルが上にはみ出る時は、HTMLキャンバスの高さで合わせる（スマホのランドスケープモードとか）
      modelMatrix.scale(canvas.height / canvas.width, 1);
    }
    modelMatrix.translateRelative(defaultPosition.x, defaultPosition.y);
    // モデルが良い感じの大きさになるように拡大・縮小
    projectionMatrix.multiplyByMatrix(modelMatrix);
    const scale = defaultPosition.z;
    projectionMatrix.scaleRelative(scale, scale);
    model.getRenderer().setMvpMatrix(projectionMatrix);
  };
  resizeModel();

  // フレームバッファとビューポートを、フレームワーク設定
  model.getRenderer().setRenderState(frameBuffer, viewport);

  window.onresize = () => {
    resizeModel();
  };

  debug("model setup done %o", model);
  modelCache.set(modelName, model);
  return { model };
};

export const render = (
  gl: WebGLRenderingContext,
  viewport: number[],
  modelContainer: AppCubismUserModel,
  keypoints: Keypoint[],
  timer: { getDelta: () => number; lap: () => void },
) => {
  debug("render(%o)", { gl, viewport, modelContainer, keypoints, timer });

  const frameBuffer: WebGLFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);

  // モデルの位置調整
  const model = modelContainer.getModel();
  const idManager = CubismFramework.getIdManager();

  const { head, pupils, mouth, eyes } = calcFace(keypoints);

  // 線形補間のしきい値
  // 動きをなめらかにする効果がある
  // 1に近いほど、モデルの動きが鈍くなる（1だと一生動かない）
  const lerpFraction = 0.35;

  const paramAngleXId = idManager.getId("ParamAngleX");
  model.setParameterValueById(
    paramAngleXId,
    getLerp(
      // XXX: xを渡すとなぜか首が上下に動く…
      head.degrees.y,
      model.getParameterValueById(paramAngleXId),
      lerpFraction,
    ),
  );
  const paramAngleYId = idManager.getId("ParamAngleY");
  model.setParameterValueById(
    paramAngleYId,
    getLerp(
      // XXX: yを渡すとなぜか首が左右に動く…
      head.degrees.x,
      model.getParameterValueById(paramAngleYId),
      lerpFraction,
    ),
  );
  const paramAngleZId = idManager.getId("ParamAngleZ");
  model.setParameterValueById(
    paramAngleZId,
    getLerp(
      head.degrees.z,
      model.getParameterValueById(paramAngleZId),
      lerpFraction,
    ),
  );

  // 眼球の動きをわかりやすくする
  const eyeBallAmplification = 2;
  const paramEyeBallXId = idManager.getId("ParamEyeBallX");
  model.setParameterValueById(
    paramEyeBallXId,
    getLerp(
      pupils.x * eyeBallAmplification,
      model.getParameterValueById(paramEyeBallXId),
      lerpFraction,
    ),
  );
  const paramEyeBallYId = idManager.getId("ParamEyeBallY");
  model.setParameterValueById(
    paramEyeBallYId,
    getLerp(
      pupils.y * eyeBallAmplification,
      model.getParameterValueById(paramEyeBallYId),
      lerpFraction,
    ),
  );

  // 体を傾ける
  // 顔の角度に合わせて動かすので、傾きを減衰させる
  const bodyAttenuation = 0.3; // 減衰率
  const paramBodyAngleXId = idManager.getId("ParamBodyAngleX");
  model.setParameterValueById(
    paramBodyAngleXId,
    getLerp(
      head.degrees.x * bodyAttenuation,
      model.getParameterValueById(paramBodyAngleXId),
      lerpFraction,
    ),
  );
  const paramBodyAngleYId = idManager.getId("ParamBodyAngleY");
  model.setParameterValueById(
    paramBodyAngleYId,
    getLerp(
      head.degrees.y * bodyAttenuation,
      model.getParameterValueById(paramBodyAngleYId),
      lerpFraction,
    ),
  );
  const paramBodyAngleZId = idManager.getId("ParamBodyAngleZ");
  model.setParameterValueById(
    paramBodyAngleZId,
    getLerp(
      head.degrees.z * bodyAttenuation,
      model.getParameterValueById(paramBodyAngleZId),
      lerpFraction,
    ),
  );

  // 左右の目のまばたきのタイミングを合わせる
  const paramEyeLOpenId = idManager.getId("ParamEyeLOpen");
  const paramEyeROpenId = idManager.getId("ParamEyeROpen");
  let stabilizedEyes = stabilizeBlink(
    {
      l: getLerp(
        eyes.l,
        model.getParameterValueById(paramEyeLOpenId),
        lerpFraction,
      ),
      r: getLerp(
        eyes.r,
        model.getParameterValueById(paramEyeROpenId),
        lerpFraction,
      ),
    },
    head.y,
  );
  model.setParameterValueById(paramEyeLOpenId, stabilizedEyes.l);
  model.setParameterValueById(paramEyeROpenId, stabilizedEyes.r);

  // 口パク
  const paramMouthAId = idManager.getId("ParamMouthA");
  model.setParameterValueById(
    paramMouthAId,
    getLerp(
      mouth.shape.A,
      model.getParameterValueById(paramMouthAId),
      lerpFraction,
    ),
  );
  const paramMouthIId = idManager.getId("ParamMouthI");
  model.setParameterValueById(
    paramMouthIId,
    getLerp(
      mouth.shape.I,
      model.getParameterValueById(paramMouthIId),
      lerpFraction,
    ),
  );
  const paramMouthUId = idManager.getId("ParamMouthU");
  model.setParameterValueById(
    paramMouthUId,
    getLerp(
      mouth.shape.U,
      model.getParameterValueById(paramMouthUId),
      lerpFraction,
    ),
  );
  const paramMouthEId = idManager.getId("ParamMouthE");
  model.setParameterValueById(
    paramMouthEId,
    getLerp(
      mouth.shape.E,
      model.getParameterValueById(paramMouthEId),
      lerpFraction,
    ),
  );
  const paramMouthOId = idManager.getId("ParamMouthO");
  model.setParameterValueById(
    paramMouthOId,
    getLerp(
      mouth.shape.O,
      model.getParameterValueById(paramMouthOId),
      lerpFraction,
    ),
  );

  model.saveParameters();
  // モデルの状態を更新
  modelContainer.update(timer.getDelta());

  // モデルの再描画
  modelContainer.getRenderer().setRenderState(frameBuffer, viewport);
  modelContainer.getRenderer().drawModel();

  // タイマーの更新
  timer.lap();
};

/**
 * テクスチャを生成する
 * @param {Blob} blob
 * @param {WebGLRenderingContext} gl
 */
async function createTexture(
  blob: Blob,
  gl: WebGLRenderingContext,
): Promise<WebGLTexture> {
  return new Promise((resolve: (texture: WebGLTexture) => void) => {
    const url = URL.createObjectURL(blob);
    const img: HTMLImageElement = new Image();
    img.onload = () => {
      const tex: WebGLTexture = gl.createTexture() as WebGLTexture;

      // テクスチャを選択
      gl.bindTexture(gl.TEXTURE_2D, tex);

      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // 乗算済みアルファ方式を使用する
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);

      // テクスチャにピクセルを書き込む
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

      // ミップマップを生成
      gl.generateMipmap(gl.TEXTURE_2D);
      URL.revokeObjectURL(url);
      return resolve(tex);
    };
    img.addEventListener("error", () => {
      console.error(`image load error`);
    });
    img.src = url;
  });
}
