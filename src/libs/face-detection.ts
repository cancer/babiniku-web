import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calcHead } from "kalidokit/dist/FaceSolver/calcHead.js";
import { calcEyes, calcPupils } from "kalidokit/dist/FaceSolver/calcEyes.js";
import { calcMouth } from "kalidokit/dist/FaceSolver/calcMouth.js";
import { Face, type Results } from "kalidokit";

export interface Keypoint {
  x: number;
  y: number;
  z?: number;
}
export const provideLandMarker = async () =>  {
  const fileSet = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
  );
  const faceLandMarker = await FaceLandmarker.createFromOptions(fileSet, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
    runningMode: "VIDEO",
    outputFaceBlendshapes: true,
    numFaces: 1,
  });
  
  return faceLandMarker;
}

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
