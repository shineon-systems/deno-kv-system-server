import { html, css } from "../../utils/react-components.ts";

export default function Header () {
  return html`
    <header>
      <h1>Shineponics</h1>
    </header>
  `
}

css`
  header {
    width: 100%;
    padding: 10px;
    border-bottom: 2pm solid black;
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }
`