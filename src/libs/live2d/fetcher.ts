import $debug from "debug";
import { CubismModelSettingJson } from "./Live2dSDK";

const debug = $debug("app:live2d");

export type ModelData = {
  modelSetting: CubismModelSettingJson;
  moc3: ArrayBuffer;
  physics: ArrayBuffer;
  textures: HTMLImageElement[];
};

const modelDataCache: Map<string, ModelData> = new Map();

/**
 * Live2Dモデルのバイナリ群を取得する
 */
export const fetchModelData = async (modelName: string): Promise<ModelData> => {
  const cached = modelDataCache.get(modelName);
  if (cached) {
    debug("modelDataCache hit.");
    return cached;
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
      textureFiles.map((fileName) => fetchAsImage(`${modelDir}/${fileName}`)),
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

const fetchAsArrayBuffer = async (fileName: string) => {
  debug("fetch %s...", fileName);
  const res = await fetch(fileName);

  if (!res.ok) throw new Error("Failed to fetch.");

  return res.arrayBuffer();
};

const fetchAsImage = async (fileName: string): Promise<HTMLImageElement> => {
  debug("fetch %s...", fileName);
  const res = await fetch(fileName);

  if (!res.ok) throw new Error("Failed to fetch.");

  const url = URL.createObjectURL(await res.blob());
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.addEventListener("error", () => reject());
    img.src = url;
  });
};

// モデルの設定ファイルを取得してModelSettingJsonインスタンスを返す
const fetchModelSetting = async (fileName: string) => {
  const buf = await fetchAsArrayBuffer(fileName);
  return new CubismModelSettingJson(buf, buf.byteLength);
};
