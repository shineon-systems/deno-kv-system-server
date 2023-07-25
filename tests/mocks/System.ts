
import { System } from "../../types.ts"

export const system: System = {
  polling_interval: 300000,
  timeout: 1000,
  devices: {
    "123": {
      id: "123",
      sensors: {
        "soil_moisture": {
          name: "soil_moisture",
          unit: "%",
          value: undefined
        },
        "temperature": {
          name: "temperature",
          unit: "degrees C",
          value: undefined
        },
        "humidity": {
          name: "humidity",
          unit: "%H",
          value: undefined
        }
      },
      controls: {}
    },
    "456": {
      id: "456",
      sensors: {},
      controls: {
        "water_valve": {
          name: "water_valve",
          unit: "seconds open",
          value: undefined,
          calc: (state) => {
            if (
              Number(state["123"].sensors["soil_moisture"].value) < 40 && 
              (new Date().getHours() <= 10 ||
              new Date().getHours() >= 15)
            ) {
              return "5"
            }
            return "10"
          } 
        }
      }
    }
  }
}