import $debug from "debug";
const debug = $debug("app:live2d");

/**
 *
 * @param {{
 *   id: string;
 *   width: number;
 *   height: number;
 * }} params
 * @return {{canvas: HTMLCanvasElement; gl: WebGLRenderingContext}}
 */
export const createStage = ({ id, width, height }) => {
  const currentEl = document.getElementById(id);
  if (currentEl !== null) {
    debug("stage already exists.");
    return { canvas: currentEl, gl: currentEl.getContext("webgl") };
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
