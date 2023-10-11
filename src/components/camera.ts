type Props = {
  srcObject: MediaStream;
  width: number;
  height: number;
};
export const Camera = (props: Props) => {
  const el = document.createElement("video");
  el.id = "camera";
  el.srcObject = props.srcObject;
  el.play();

  el.width = props.width;
  el.height = props.height;

  return {
    ref() {
      return el;
    },
    render(app: HTMLElement) {
      app.appendChild(el);
    },
  };
};
