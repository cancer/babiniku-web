import $debug from "debug";
import { CubismModelSettingJson } from "./Live2dSDK";

const debug = $debug("app:live2d");

const modelDataCache = new Map();

/**
 * Live2Dモデルのバイナリ群を取得する
 *
 * @param {string} modelName
 * @return {Promise<{
 *   modelSetting: CubismModelSettingJson,
 *   moc3: ArrayBuffer;
 *   physics: ArrayBuffer;
 *   textures: Blob[];
 * }>}
 */
export const fetchModelData = async (modelName) => {
  if (modelDataCache.has(modelName)) {
    debug("modelDataCache hit.");
    return modelDataCache.get(modelName);
  }

  debug("fetchModelData %s...", modelName);
  const modelDir = "/model";

  const modelSetting = await fetchModelSetting(`${modelDir}/${modelName}`);
  const textureFiles = [];
  for (let i = 0; i < modelSetting.getTextureCount(); i++)
    textureFiles.push(modelSetting.getTextureFileName(i));

  const [moc3, physics, textures] = await Promise.all([
    // MOC3データ
    fetchAsArrayBuffer(`${modelDir}/${modelSetting.getModelFileName()}`),
    // 物理演算データ
    fetchAsArrayBuffer(`${modelDir}/${modelSetting.getPhysicsFileName()}`),
    // テクスチャデータ
    Promise.all(
      textureFiles.map((fileName) => fetchAsBlob(`${modelDir}/${fileName}`)),
    ),
  ]);

  const data = {
    modelSetting,
    moc3,
    physics,
    textures,
  };

  modelDataCache.set(modelName, data);
  return data;
};

const fetchAsArrayBuffer = async (fileName) => {
  debug("fetch %s...", fileName);
  const res = await fetch(fileName);

  if (!res.ok) throw new Error("Failed to fetch.");

  return res.arrayBuffer();
};

const fetchAsBlob = async (fileName) => {
  debug("fetch %s...", fileName);
  const res = await fetch(fileName);

  if (!res.ok) throw new Error("Failed to fetch.");

  return res.blob();
};

// モデルの設定ファイルを取得してModelSettingJsonインスタンスを返す
const fetchModelSetting = async (fileName) => {
  const buf = await fetchAsArrayBuffer(fileName);
  return new CubismModelSettingJson(buf, buf.byteLength);
};
