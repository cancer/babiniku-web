// https://github.com/astie-dog/live2d-for-web-example/blob/main/src/lib/live2d/Live2dSDK.ts
import { Live2DCubismFramework } from '../cubism-web/Framework/live2dcubismframework'
const CubismFramework = Live2DCubismFramework.CubismFramework

import { Live2DCubismFramework as icubismmodelsetting } from '../cubism-web/Framework/icubismmodelsetting'
abstract class ICubismModelSetting extends icubismmodelsetting.ICubismModelSetting {}

import { Live2DCubismFramework as cubismmodelsettingjson } from '../cubism-web/Framework/cubismmodelsettingjson'
class CubismModelSettingJson extends cubismmodelsettingjson.CubismModelSettingJson {}

// math
import { Live2DCubismFramework as cubismmatrix44 } from '../cubism-web/Framework/math/cubismmatrix44'
class CubismMatrix44 extends cubismmatrix44.CubismMatrix44 {}

import { Live2DCubismFramework as cubismusermodel } from '../cubism-web/Framework/model/cubismusermodel'
class CubismUserModel extends cubismusermodel.CubismUserModel {}

// motion
import { Live2DCubismFramework as acubismmotion } from '../cubism-web/Framework/motion/acubismmotion'
abstract class ACubismMotion extends acubismmotion.ACubismMotion {}

// physics
import { Live2DCubismFramework as cubismphysics } from '../cubism-web/Framework/physics/cubismphysics'
class CubismPhysics extends cubismphysics.CubismPhysics {}

// cubismid
import { Live2DCubismFramework as cubismid } from '../cubism-web/Framework/id/cubismid'
type CubismIdHandle = cubismid.CubismIdHandle

// effect
import { Live2DCubismFramework as cubismeyeblink } from '../cubism-web/Framework/effect/cubismeyeblink'
class CubismEyeBlink extends cubismeyeblink.CubismEyeBlink {}

// type
import { Live2DCubismFramework as csmvector } from '../cubism-web/Framework/type/csmvector'
class csmVector<T> extends csmvector.csmVector<T> {}

export {
  CubismFramework,
  ICubismModelSetting,
  CubismModelSettingJson,
  CubismMatrix44,
  CubismUserModel,
  ACubismMotion,
  CubismPhysics,
  CubismEyeBlink,
  csmVector
}
export type {
  CubismIdHandle
}
