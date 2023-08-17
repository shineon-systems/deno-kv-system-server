import React from "react"
import htm from "htm"

export const accumulatedStyles = {
  css: ""
}

export const html = htm.bind(React.createElement)
export const css = (input: TemplateStringsArray) => {
  const cssString = String(input)
  accumulatedStyles.css += cssString
  return cssString
}