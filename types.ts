export type State = {
  name: string,
  unit: string,
  value: string | undefined
}

export type Device = {
  id: string,
  sensors: Record<string, State>,
  controls: Record<string, State & { calc: (state: Record<string, Device>) => Promise<string> | string }>
}

export type System = {
  polling_interval: number,
  timeout: number,
  devices: Record<string, Device>
}