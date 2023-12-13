import { VoidComponent } from "solid-js";

type Props = {
  message: string;
}
export const Loading: VoidComponent<Props> = (props) => <div>{props.message}</div>;
