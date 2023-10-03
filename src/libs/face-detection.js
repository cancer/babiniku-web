import "@mediapipe/face_mesh";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import {
  createDetector,
  SupportedModels,
} from "@tensorflow-models/face-landmarks-detection";
import { calcHead } from "kalidokit/dist/FaceSolver/calcHead.js";
import { calcEyes, calcPupils } from "kalidokit/dist/FaceSolver/calcEyes.js";
import { calcMouth } from "kalidokit/dist/FaceSolver/calcMouth.js";
import { Face } from "kalidokit";

export const provideDetector = () =>
  createDetector(SupportedModels.MediaPipeFaceMesh, {
    runtime: "tfjs",
    refineLandmarks: true,
  });

/**
 * @param {import("@tensorflow-models/face-detection").Keypoint[]} keypoints
 */
export const calcFace = (keypoints) => {
  const head = calcHead(keypoints);
  const pupils = calcPupils(keypoints);
  const mouth = calcMouth(keypoints);
  const eyes = calcEyes(keypoints);

  return { head, pupils, mouth, eyes };
};

export const stabilizeBlink = (eyeLerps, headY) =>
  Face.stabilizeBlink(eyeLerps, headY);
