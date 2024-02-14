import $debug from "debug";
import { LogLevel } from "../cubism-web/Framework/live2dcubismframework";
import { calcFace, Keypoint, stabilizeBlink } from "../face-detection.js";
import { getLerp } from "../util.js";
import AppCubismUserModel from "./CubismModel";
import {
  CubismFramework,
  CubismMatrix44,
  CubismModelSettingJson,
} from "./Live2dSDK";

const debug = $debug("app:live2d");

/**
 * Cubism Frameworkの初期化
 */
export const initializeCubism = () => {
  if (!CubismFramework.isStarted()) {
    CubismFramework.startUp({
      logFunction: (msg) => debug(msg),
      loggingLevel: LogLevel.LogLevel_Debug,
    });
    if (CubismFramework.isInitialized()) return;
    CubismFramework.initialize();
  }
};

export const disposeCubism = () => CubismFramework.dispose();

type ModelData = {
  modelSetting: CubismModelSettingJson;
  moc3: ArrayBuffer;
  physics: ArrayBuffer;
  textures: HTMLImageElement[];
};
const modelCache: Map<string, AppCubismUserModel> = new Map();
/**
 * Live2dモデルのロードと初期設定
 */
type CreateModel = (params: {
  data: ModelData;
  position: Partial<{ x: number; y: number; z: number }>;
}) => AppCubismUserModel;
export const createModel: CreateModel = ({
  data: { modelSetting, moc3, physics },
}) => {
  const modelName = modelSetting.getModelFileName();
  const cachedModel = modelCache.get(modelName);
  if (cachedModel !== undefined) {
    debug("model cache hit. %o", cachedModel);
    return cachedModel;
  }

  debug("createModel(%o)", { modelSetting, moc3, physics });

  const model = new AppCubismUserModel();

  // モデルデータをロード
  model.loadModel(moc3);

  const { eyeBlinks, lipSyncs } = getParameterIds(modelSetting);

  // 目ぱちIDをモデルに紐づけ
  for (const id of eyeBlinks) model.addEyeBlinkParameterId(id);

  // 口パクIDをモデルに紐づけ
  for (const id of lipSyncs) model.addLipSyncParameterId(id);

  // 物理演算設定
  model.loadPhysics(physics, physics.byteLength);

  modelCache.set(modelName, model);
  return model;
};

/**
 * Live2Dモデルのサイズ調整用関数
 */
export const createResizer = (
  model: AppCubismUserModel,
  position: { x: number; y: number; z: number },
) => {
  const projectionMatrix = new CubismMatrix44();
  return {
    resize(canvasRect: { width: number; height: number }) {
      const modelMatrix = model.getModelMatrix();
      modelMatrix.bottom(0);
      modelMatrix.centerY(-1);
      modelMatrix.translateY(-1);
      projectionMatrix.loadIdentity();
      modelMatrix.translateRelative(position.x, position.y);
      const canvasRatio = canvasRect.height / canvasRect.width;
      if (1 < canvasRatio) {
        // モデルが横にはみ出る時は、HTMLキャンバスの幅で合わせる
        modelMatrix.scale(1, canvasRect.width / canvasRect.height);
      } else {
        // モデルが上にはみ出る時は、HTMLキャンバスの高さで合わせる（スマホのランドスケープモードとか）
        modelMatrix.scale(canvasRect.height / canvasRect.width, 1);
      }
      // モデルが良い感じの大きさになるように拡大・縮小
      projectionMatrix.multiplyByMatrix(modelMatrix);
      const scale = position.z;
      projectionMatrix.scaleRelative(scale, scale);
      model.getRenderer().setMvpMatrix(projectionMatrix);
    },
  };
};

type BindModelToStage = (
  gl: WebGLRenderingContext,
  model: AppCubismUserModel,
  textures: HTMLImageElement[],
  viewport: number[],
) => void;
export const bindModelToStage: BindModelToStage = (
  gl,
  model,
  textures,
  viewport,
) => {
  debug("bindModelToStage(%o)", { gl, model, textures, viewport });

  // レンダラの作成（bindTextureより先にやっておく）
  model.createRenderer();
  // テクスチャをレンダラに設定
  let i = 0;
  for (let img of textures) {
    const texture = createTexture(img, gl);
    model.getRenderer().bindTexture(i, texture);
    i++;
  }
  // そのほかレンダラの設定
  model.getRenderer().setIsPremultipliedAlpha(true);
  model.getRenderer().startUp(gl);

  // フレームバッファとビューポートを、フレームワーク設定
  model
    .getRenderer()
    .setRenderState(gl.getParameter(gl.FRAMEBUFFER_BINDING), viewport);
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

const getParameterIds = (modelSetting: CubismModelSettingJson) => {
  // 目パチのパラメーターIDを列挙
  const eyeBlinks = [];
  for (
    let i = 0, len = modelSetting.getEyeBlinkParameterCount();
    i < len;
    i++
  ) {
    eyeBlinks.push(modelSetting.getEyeBlinkParameterId(i));
  }

  // 口パクのパラメーターIDを列挙
  const lipSyncs = [];
  for (let i = 0, len = modelSetting.getLipSyncParameterCount(); i < len; i++) {
    lipSyncs.push(modelSetting.getLipSyncParameterId(i));
  }

  return {
    eyeBlinks,
    lipSyncs,
  };
};

const createTexture = (
  img: HTMLImageElement,
  gl: WebGLRenderingContext,
): WebGLTexture => {
  const texture = gl.createTexture();
  if (texture === null) throw new Error("Failed to create texture.");

  // テクスチャを選択
  gl.bindTexture(gl.TEXTURE_2D, texture);

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

  return texture;
};
