import { ReactElement } from "react";
import { html, css } from "../../utils/react-components.ts";

type NodeProps = {
  content: ReactElement,
  children: ReactElement[]
}

export default function Node ({ content, children }: NodeProps) {
  return html`
    <details class="node">
      <summary>
        ${content}
      </summary>
      <div class="children">
        ${children}
      </div>
    </details>
  `
}

css`
  .node {
    margin: 20px auto;
    display: flex;
    justify-content: center;
  }

  .node > summary {
    cursor: pointer;
    margin: auto;
    width: 150px;
    height: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px solid black;
    border-radius: 50%;
    background-color: white;
  }

  .node[open] > summary {
    background-color: #eaeaea;
  }

  .node > .children {
    transform: scale(0.8);
    display: flex;
  }
`