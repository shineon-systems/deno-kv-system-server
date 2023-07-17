import * as Peko from "https://deno.land/x/peko@1.9.0/mod.ts";
import { getAccess, POST2Sheet } from "./utils/gcp.ts";

const server = new Peko.Server();
server.use(Peko.logger(console.log));

const kv = await Deno.openKv(); 
const access_creds = await getAccess("https://www.googleapis.com/auth/spreadsheets");

const system = [
  {
    id: "123",
    sensors: [
      {
        name: "soil_moisture",
        unit: "%",
        value: undefined
      },
      {
        name: "temperature",
        unit: "degrees C",
        value: undefined
      },
      {
        name: "humidity",
        unit: "%H",
        value: undefined
      }
    ],
    controls: []
  },
  {
    id: "456",
    sensors: [],
    controls: [
      {
        name: "water_valve",
        unit: "seconds open",
        value: undefined,
        calc: (state) => {
          const moistureSensor = state.find(d => d.id === "123").sensors.find(s => s.name === "soil_moisture")
          if (
            Number(moistureSensor.value) < 40 && 
            (new Date().getHours() <= 10 ||
            new Date().getHours() >= 15)
          ) {
            return "5"
          }
          return "10"
        } 
      }
    ]
  }
] 

// devices connect first to verify their config and receive polling data
// potentially need devices to send up their sensors & controllers for validation here
server.get("/connect/:id", async (ctx) => {
  if (!system.find(device => device.id === ctx.params.id)) return new Response("Not found.", {
    status: 401
  })

  let last_poll = (await kv.get(["last_poll", ""])).value;
  if (!last_poll) {
    last_poll = Math.round(Date.now()/1000)
    kv.set(["last_poll", ""], last_poll)
  }

  kv.set(["connected", ctx.params.id], true);
  return new Response(JSON.stringify({ 
    polling_interval: 300,
    last_poll
  }))
});

server.post("/sense/:id", async (ctx) => {
  const device = system.find(dev => dev.id === ctx.params.id)

  if (!device) return new Response("No device with matching id found.", {
    status: 400
  })

  if (!(await kv.get(["connected", ctx.params.id])).value) {
    return new Response("Not connected.", {
      status: 400
    })
  }
  
  const nowSec = Math.round(Date.now()/1000)
  const senseData = await ctx.request.json()

  // immediately store device data and set processor to this request
  // so data is accessible by whichever device process maintains processor
  await kv.set(["state", device.id], senseData)
  await kv.set(["processer", ""], device.id)

  // 1s buffer for all connected shinodes to call
  await new Promise(res => setTimeout(res, 1000))

  if ((await kv.get(["processer", ""])).value === device.id) { 
    await kv.set(["state", "system"], null)
    const newSystemState = []

    // build a copy of state - we don't want old values hanging around
    for (const devi of system) {
      const copy = { ...devi }
      delete copy.controls

      const deviceData = (await kv.get(["state", devi.id])).value
      if (!deviceData) kv.set(["connected", devi.id], false)
      else {
        kv.set(["connected", devi.id], nowSec)
        copy.sensors = deviceData
      }
      
      newSystemState.push(copy)
      kv.set(["state", devi.id], null)
    }

    kv.set(["last_poll", ""], nowSec)
    await kv.set(["state", "system"], newSystemState)
    POST2Sheet(newSystemState)
    // console.log(newSystemState)
  }

  // retrieve state for each shinode req, whether processor or not.
  // loop accounts for processor compute and store time
  let systemState = (await kv.get(["state", "system"])).value
  while (!systemState && count < 10) {
    await new Promise(res => setTimeout(res, 100))
    systemState = (await kv.get(["state", "system"])).value
  }

  // calc any required actions for shinode from state
  const controls = []
  for (const control of device.controls) {
    const copy = { ...control }
    copy.value = copy.calc(systemState)
    delete copy.calc
    controls.push(copy)
  }

  system.forEach(async device_ => console.log((await kv.get(["connected", device_.id]).value)))
  console.log((await kv.get(["state", "system"]).value))

  // may need to respond with last_poll but should be set on device 
  // when response arrives
  return new Response(JSON.stringify(controls))
})

server.post("/control/:id", async (ctx) => {
  console.log(await ctx.request.text())
  return new Response("nice!")
})

server.listen(7777, () => console.log("Peko server started - let's go!"));