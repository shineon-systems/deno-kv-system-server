import { html, accumulatedStyles } from "../../utils/react-components.ts";

export default function Head ({ title, desc }: Record<string, string>) {
  return html`
    <head>
      <title>${title}</title>
      <meta type="desc" content=${desc} />
      <style>
        html, body {
          min-height: 100%:
          min-width: 100%;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          font-family: Helvetica;
        }
      </style>
      <style>${accumulatedStyles.css}</style>
    </head>
  `
}