import { type VoidComponent } from "solid-js";
import { ErrorBoundary, render } from "solid-js/web";
import { App } from "./src/app.tsx";

import "./style.css";

const app = document.querySelector<HTMLElement>("#app");
if (app === null) throw new Error("Failed to find root element.");

const ErrorMessage: VoidComponent<{message: string;}> = (props) => (
  <div>{props.message}</div>
)

render(
  () => (
    <ErrorBoundary
      fallback={(err) => {
        console.error(err);
        return (
          <ErrorMessage message={err.message} />
        );
      }}
    >
      <App />
    </ErrorBoundary>
  ),
  app,
);
