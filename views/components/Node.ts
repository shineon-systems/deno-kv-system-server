import { useRef, useEffect, ReactElement, ReactNode } from "react";
import { html, css } from "../../utils/react-components.ts";

type NodeProps = {
  title: string,
  children: ReactElement[]
}

export default function Node ({ title, children }: NodeProps) {
  const ref = useRef<HTMLElement>();

  // useEffect(() => {
  //   if (ref.current) {
  //     ref.current.
  //   }
  // }, [ref]);

  // const drawLinesToChildren = () => {

  // }

  return html`
    <details ref=${ref}>
      <summary class="node">
        ${title}
      </summary>

      ${children}
    </details>
  `
}

css`
  .node {
    cursor: pointer;
    width: 150px;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid black;
    border-radius: 50%;
  }

  details[open] > summary {
    background-color: #eaeaea;
  }
`