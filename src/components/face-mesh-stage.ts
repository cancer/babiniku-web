import {
  type Face,
  SupportedModels,
  util,
} from "@tensorflow-models/face-landmarks-detection";

type Props = {
  faces: Face[];
  id: string;
  width: number;
  height: number;
};
export const FaceMeshStage = (props: Props) => {
  const el = document.createElement("canvas");
  el.id = props.id;
  el.width = props.width;
  el.height = props.height;

  const ctx = el.getContext("2d");
  if (ctx === null) throw new Error("Failed to get canvas context.");

  // 顔のパーツを描画する
  for (const face of props.faces) {
    // 顔を囲む枠
    const { xMin, yMin, xMax, yMax } = face.box;
    const path = getPath([
      [xMin, yMin],
      [xMax, yMin],
      [xMax, yMax],
      [xMin, yMax],
    ]);
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.stroke(path);

    // 顔の各パーツ
    const keypoints = face.keypoints.map(({ x, y }) => [x, y]);
    const contours = util.getKeypointIndexByContour(
      SupportedModels.MediaPipeFaceMesh,
    );
    for (const contour of Object.values(contours)) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      const path = contour.map((index) => keypoints[index]);
      if (path.every(Boolean)) ctx.stroke(getPath(path));
    }
  }

  return {
    render(app: HTMLElement) {
      const currentStage = app.querySelector(`#${props.id}`);
      if (currentStage) app.replaceChild(el, currentStage);
      else app.appendChild(el);
    },
  };
};

const getPath = (points: number[][]) => {
  const path = new Path2D();
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    path.lineTo(point[0], point[1]);
  }

  path.closePath();
  return path;
};
