import { ReactElement } from "react";
import { html, css } from "../../utils/react-components.ts";

type NodeProps = {
  title: string,
  children: ReactElement[]
}

export default function System ({ title, children }: NodeProps) {
  return html`
    <div class="node">
      ${title}
    </div>
    ${children && children.map(child => {
      return html`<div class="node-child">
        ${child}
      </div>`
    })}
  `
}

css`
  .node {
    border: 2px solid black;
    border-radius: 50%;
    width: 150px;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`