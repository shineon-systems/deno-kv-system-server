import { html, accumulatedStyles } from "../../utils/react-components.ts";

export default function Head ({ title, desc }: Record<string, string>) {
  return html`
    <head>
      <title>${title}</title>
      <meta type="desc" content=${desc} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

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
      <style dangerouslySetInnerHTML=${{ __html: accumulatedStyles.css }}></style>
    </head>
  `
}