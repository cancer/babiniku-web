export const Loading = () => {
  const el = document.createElement("div");
  el.id = "loading";
  el.innerHTML = "Detecting face...";

  return {
    render(app) {
      app.appendChild(el);
    },
    destroy(app) {
      if (app.querySelector("#loading") === null) return;
      app.removeChild(el);
    },
  };
};
