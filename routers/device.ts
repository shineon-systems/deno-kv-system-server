import * as Peko from "https://deno.land/x/peko@1.9.0/mod.ts";
import { system } from "../models/System.ts";
import { Device, State } from "../types.ts";

const router = new Peko.Router();
const kv = await Deno.openKv(); 

// devices connect first to verify their config and receive polling data
router.post("/connect/:id", async (ctx) => {
  const requesting_device = system.devices[ctx.params.id as string]
  if (!requesting_device) return new Response("No device with matching id found.", { status: 400 })

  // validate device config
  const body = await ctx.request.json();
  if (!Object.values(requesting_device.sensors).every(sensor => body.sensors.some((sens: State) => {
    return sensor.name === sens.name &&
    sensor.unit === sens.unit &&
    sensor.value === sens.value
  }))) {
    return new Response("Incorrect sensor config on device.", { status: 400 })
  }
  if (!Object.values(requesting_device.controls).every(control => body.controls.some((cont: State) => {
    return control.name === cont.name &&
    control.unit === cont.unit &&
    control.value === cont.value
  }))) {
    return new Response("Incorrect control config on device.", { status: 400 })
  }

  let last_poll = Number((await kv.get(["last_poll", ""])).value);
  if (!last_poll) {
    last_poll = Date.now()
    kv.set(["last_poll", ""], last_poll)
  }

  kv.set(["connected", requesting_device.id], Date.now());
  return new Response(JSON.stringify({ 
    polling_interval: 300,
    last_poll: Math.round(last_poll/1000) // convert to s
  }))
});

router.post("/sense/:id", async (ctx) => {
  const poll_time = Date.now()
  const requesting_device = system.devices[ctx.params.id as string]
  if (!requesting_device) return new Response("No device with matching id found.", { status: 400 })

  const device_connected = Number((await kv.get(["connected", requesting_device.id])).value)
  const last_poll = Number((await kv.get(["last_poll", ""])).value)

  if (device_connected) {
    if (device_connected < last_poll + system.polling_interval) { 
      kv.set(["connected", requesting_device.id], poll_time)
      kv.set(["last_poll", ""], poll_time)
    } else {
      return new Response("Device already polled sense this interval.", { status: 400 })
    }
  } else {
    return new Response("Device not connected.", { status: 400 })
  }
  
  // set up state with default sensor/control values then overwrite with sensor data
  const senseData: State[] = await ctx.request.json();
  const device_state = requesting_device;
  senseData.forEach(sensor => device_state.sensors[sensor.name] = sensor);
  await kv.set(["state", requesting_device.id], device_state);

  // await all connected devices states OR system timeout
  // default state used if no poll from a device
  const start = Date.now();
  const connected: string[] = [];
  const system_state = system.devices;
  while (Date.now() - start < system.timeout) {
    for (const device_id in system.devices) {
      if (!connected.includes(device_id)) {
        const conn_status = Number((await kv.get(["connected", device_id])).value);
        if (conn_status > Date.now() - system.polling_interval) {
          system_state[device_id] = (await kv.get(["state", device_id])).value as Device;
          connected.push(device_id);
        }
      }
    }
    if (connected.length >= Object.keys(system.devices).length) break;
    await new Promise(res => setTimeout(res, 10))
  }

  // feed system state into device control calcs
  const controls: State[] = [];
  for (const control_id in requesting_device.controls) {
    const control = requesting_device.controls[control_id]
    const device_control_state = { 
      ...control,
      value: await control.calc(system_state) 
    }
    controls.push(device_control_state)
    device_state.controls[control_id] = device_control_state
  }

  // save device control states
  kv.set(["state", requesting_device.id], device_state)

  return new Response(JSON.stringify({ 
    actions: controls, 
    last_poll: Math.round(poll_time / 1000), // convert from ms to s
    polling_interval: Math.round(system.polling_interval / 1000), // convert from ms to s
  }))
})

router.post("/control/:id", async (ctx) => {
  const requesting_device = system.devices[ctx.params.id as string];
  if (!requesting_device) return new Response("No device with matching id found.", { status: 400 });

  const device_connected = Number((await kv.get(["connected", requesting_device.id])).value);
  const last_poll = Number((await kv.get(["last_poll", ""])).value);

  if (!device_connected) {
    return new Response("Device not connected.", { status: 400 });
  } else if (device_connected > last_poll + system.polling_interval) { 
    return new Response("Device already polled control this interval.", { status: 400 });
  } else {
    await kv.set(["connected", requesting_device.id], Date.now());
  }
  
  const controlData = await ctx.request.json();
  const deviceState = (await kv.get(["state", requesting_device.id])).value as Record<string, State>;
  await kv.set(["state", requesting_device.id], { ...deviceState, ...controlData });

  return new Response("Ta!");
})

export default router;