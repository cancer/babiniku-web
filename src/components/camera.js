export const Camera = (props) => {
  const el = document.createElement('div');
  el.style.position = "relative";
  el.style.width = `${props.width}px`;
  el.style.height = `${props.height}px`;

  const camera = document.createElement("video");
  camera.id = "camera";
  camera.srcObject = props.srcObject;
  camera.play();

  camera.width = props.width;
  camera.height = props.height;

  const blur = document.createElement("div");
  blur.id = "cameraBlur"

  el.appendChild(camera);
  el.appendChild(blur);

  return {
    ref() {
      return camera;
    },
    render(app) {
      app.appendChild(el);
    },
  };
};
