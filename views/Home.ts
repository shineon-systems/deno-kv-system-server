import { html, css } from "../utils/react-components.ts";
import { System } from "../types.ts";

import Head from "./components/Head.ts";
import Header from "./components/Header.ts";
import Node from "./components/Node.ts";

export default function Home ({ systems }: { systems: System[] }) {
  systems = [ ...systems, ...systems]
  return html`
    <${Head} title="Shineponics" desc="Smart food sovereignty" />

    <body>
      <${Header} />

      <main>
        ${systems.map(system => html`<${Node} content=${system.id}>
          ${Object.values(system.devices).map(device => html`<${Node} content=${device.id}>
            ${[
              ...Object.values(device.sensors), 
              ...Object.values(device.controls)
            ].map(hardware => html`<${Node} 
              content=${html`
                <p><strong>${hardware.name}</strong></p>
                <p>${hardware.value}${hardware.unit}</p>
              `}>
            </${Node}>`)}
          </${Node}>`)}
        </${Node}>`)}
      </main>
    </body>
  `
}

css`
  main {
    flex: 1;
    background-color: whitesmoke;
    overflow: scroll;
  }
`