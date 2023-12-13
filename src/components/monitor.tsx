import { Monitor } from "gl-perf";
import { createEffect, onCleanup, onMount, VoidComponent } from "solid-js";

type Props = {
  canvas: HTMLCanvasElement;
};
export const PerfMonitor: VoidComponent<Props> = (props) => {
  let monitor: Monitor;
  onMount(() => {
    console.log(props.canvas)
    monitor = new Monitor(props.canvas);
  });
  createEffect(() => {
    const loop = () => {
      rafId = requestAnimationFrame(() => loop());
      monitor.update();
    };
    let rafId = requestAnimationFrame(() => loop());
    onCleanup(() => cancelAnimationFrame(rafId));
  });
  
  return <></>;
};
