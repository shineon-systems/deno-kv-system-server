import { html, css } from "../utils/react-components.ts";
import { System } from "../types.ts";

import Head from "./components/Head.ts";
import Header from "./components/Header.ts";
import Node from "./components/Node.ts";

export default function Home ({ systems }: { systems: System[] }) {
  return html`
    <${Head} title="Shineponics" desc="Smart food sovereignty" />

    <body>
      <${Header} />

      <main>
        ${systems.map(system => html`<${Node} title=${system.id}>
          ${Object.values(system.devices).map(device => html`<${Node} title=${device.id} />`)}
        </${Node}>`)}
      </main>
    </body>
  `
}

css`
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`