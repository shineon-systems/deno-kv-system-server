import { Handler } from "peko";
import { loadSystem } from "../models/System.ts";
import { Device, Sensor, Controller } from "../types.ts";

const kv = await Deno.openKv(); 

// devices connect first to verify their config and receive polling data
export const connect: Handler = async (ctx) => {
  const system = loadSystem(ctx.request);
  const requesting_device = system.devices[ctx.params.id as string];
  if (!requesting_device) return new Response("No device with matching id found.", { status: 400 });

  // validate device config
  const body = await ctx.request.json();
  if (!Object.values(requesting_device.sensors).every(sensor => body.sensors.some((sens: Sensor) => {
    return sensor.name === sens.name &&
    sensor.unit === sens.unit &&
    sensor.value === sens.value
  }))) {
    return new Response("Incorrect sensor config on device.", { status: 400 });
  }
  if (!Object.values(requesting_device.controls).every(control => body.controls.some((cont: Controller) => {
    return control.name === cont.name &&
    control.unit === cont.unit &&
    control.value === cont.value
  }))) {
    return new Response("Incorrect control config on device.", { status: 400 });
  }

  let last_poll = Number((await kv.get(["last_poll", ""])).value);
  if (!last_poll) {
    last_poll = Date.now();
    kv.set(["last_poll", ""], last_poll);
  }

  kv.set(["connected", requesting_device.id], Date.now());

  return new Response(JSON.stringify({ 
    polling_interval: Math.round(system.polling_interval/1000), // convert ms to s
    last_poll: Math.round(last_poll/1000) // convert to s
  }));
};

export const sense: Handler = async (ctx) => {
  const system = loadSystem(ctx.request);
  
  const poll_time = Date.now();
  const requesting_device = system.devices[ctx.params.id as string];
  if (!requesting_device) return new Response("No device with matching id found.", { status: 400 });

  const device_connected = Number((await kv.get(["connected", requesting_device.id])).value);
  const last_poll = Number((await kv.get(["last_poll", ""])).value);

  if (device_connected) {
    if (device_connected < last_poll + system.polling_interval) { 
      kv.set(["connected", requesting_device.id], poll_time);
      kv.set(["last_poll", ""], poll_time);
    } else {
      return new Response("Device already polled sense this interval.", { status: 400 });
    }
  } else {
    return new Response("Device not connected.", { status: 400 });
  }
  
  // set up state with default sensor/control values then overwrite with sensor data
  const senseData: Sensor[] = await ctx.request.json();
  const device_clone = structuredClone(requesting_device);
  senseData.forEach(sensor => device_clone.sensors[sensor.name] = sensor);
  await kv.set(["state", requesting_device.id], device_clone);

  // await all connected devices states OR system timeout
  // default state used if no poll from a device
  const start = Date.now();
  const connected: string[] = [];
  const system_clone = structuredClone(system.devices);
  while (Date.now() - start < system.timeout) {
    for (const device_id in system.devices) {
      if (!connected.includes(device_id)) {
        const conn_status = Number((await kv.get(["connected", device_id])).value);
        if (conn_status > Date.now() - system.polling_interval) {
          system_clone[device_id] = (await kv.get(["state", device_id])).value as Device;
          connected.push(device_id);
        }
      }
    }
    if (connected.length >= Object.keys(system.devices).length) break;
    await new Promise(res => setTimeout(res, 10));
  }

  // feed system state into device control calcs
  const controls: Controller[] = [];
  for (const control_id in requesting_device.controls) {
    const control = device_clone.controls[control_id];
    const device_control_state = { 
      ...control,
      value: await control.calc(system_clone) 
    };
    controls.push(device_control_state);
    device_clone.controls[control_id] = device_control_state;
  }

  // save device control states
  kv.set(["state", requesting_device.id], device_clone);

  return new Response(JSON.stringify({ 
    actions: controls, 
    last_poll: Math.round(poll_time / 1000), // convert from ms to s
    polling_interval: Math.round(system.polling_interval / 1000), // convert from ms to s
  }));
}

export const control: Handler = async (ctx) => {
  const system = loadSystem(ctx.request);
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
  const deviceState = (await kv.get(["state", requesting_device.id])).value as Record<string, Sensor>;
  await kv.set(["state", requesting_device.id], { ...deviceState, ...controlData });

  return new Response("Ta!");
}