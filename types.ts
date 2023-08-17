export type Sensor = {
  name: string,
  unit: string,
  value: string | undefined
}

export type Controller = Sensor & {
  calc: (state: Record<string, Device>) => Promise<string> | string
}

export type Device = {
  id: string,
  sensors: Record<string, Sensor>,
  controls: Record<string, Controller>
}

export type System = {
  id: string,
  polling_interval: number,
  timeout: number,
  devices: Record<string, Device>
}