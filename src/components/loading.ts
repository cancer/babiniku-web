export const Loading = () => {
  const el = document.createElement("div");
  el.id = "loading";
  el.innerHTML = "Detecting face...";

  return {
    render(app: HTMLElement) {
      app.appendChild(el);
    },
    destroy(app: HTMLElement) {
      if (app.querySelector("#loading") === null) return;
      app.removeChild(el);
    },
  };
};
