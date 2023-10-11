import "@mediapipe/face_mesh";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import type { Keypoint } from "@tensorflow-models/face-detection";
import {
  createDetector,
  SupportedModels,
} from "@tensorflow-models/face-landmarks-detection";
import { calcHead } from "kalidokit/dist/FaceSolver/calcHead.js";
import { calcEyes, calcPupils } from "kalidokit/dist/FaceSolver/calcEyes.js";
import { calcMouth } from "kalidokit/dist/FaceSolver/calcMouth.js";
import { Face, type Results } from "kalidokit";

export const provideDetector = () =>
  createDetector(SupportedModels.MediaPipeFaceMesh, {
    runtime: "tfjs",
    refineLandmarks: true,
  });

export const calcFace = (keypoints: Keypoint[]) => {
  const head = calcHead(keypoints as unknown as Results);
  const pupils = calcPupils(keypoints as unknown as Results);
  const mouth = calcMouth(keypoints as unknown as Results);
  const eyes = calcEyes(keypoints as unknown as Results);

  return { head, pupils, mouth, eyes };
};

export const stabilizeBlink = (
  eyeLerps: Record<string, number>,
  headY: number,
) => Face.stabilizeBlink(eyeLerps, headY);
