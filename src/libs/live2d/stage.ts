import $debug from "debug";
const debug = $debug("app:live2d");

type CreateStage = (params: { id: string; width: number; height: number }) => {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
};
export const createStage: CreateStage = ({ id, width, height }) => {
  const currentEl = document.querySelector<HTMLCanvasElement>(`canvas#${id}`);
  if (currentEl !== null) {
    debug("stage already exists.");
    const gl = currentEl.getContext("webgl");
    if (gl === null) throw new Error("This browser does not support webgl.");
    return { canvas: currentEl, gl };
  }

  debug("creating stage...");

  const canvas = document.createElement("canvas");
  canvas.id = id;
  canvas.width = width;
  canvas.height = height;

  const gl = canvas.getContext("webgl");
  if (gl === null) throw new Error("This browser does not support webgl.");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  return { canvas, gl };
};
