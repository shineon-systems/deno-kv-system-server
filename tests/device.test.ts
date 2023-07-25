import { assert } from "https://deno.land/std@0.195.0/testing/asserts.ts";
import { Server } from "https://deno.land/x/peko@1.9.0/mod.ts";
import DeviceRouter from "../routers/device.ts";
import { system } from "../models/System.ts";

const kv = await Deno.openKv();
for await (const entry of kv.list({ prefix: ["connected"] })) {
  await kv.delete(entry.key)
}
for await (const entry of kv.list({ prefix: ["state"] })) {
  await kv.delete(entry.key)
}

// Create a testing server
const server = new Server();
server.use(DeviceRouter);

Deno.test("DEVICE /connect - Device not found", async () => {
  const request = new Request("http://localhost:7777/connect/this-isnt-an-id", {
    method: "POST"
  });
  const response = await server.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "No device with matching id found.");
  assert(!(await kv.get(["connected", "123"])).value);
});

Deno.test("DEVICE /connect - Incorrect sensor config on device", async () => {
  const request = new Request("http://localhost:7777/connect/123", {
    method: "POST",
    body: JSON.stringify({
      sensors: [{ name: "incorrect_sensor", unit: "C", value: "0" }]
    })
  });
  const response = await server.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "Incorrect sensor config on device.");
  assert(!(await kv.get(["connected", "123"])).value);
});

Deno.test("DEVICE /connect - Incorrect control config on device", async () => {
  const request = new Request("http://localhost:7777/connect/456", {
    method: "POST",
    body: JSON.stringify({
      sensors: system.devices["456"].sensors,
      controls: [{ name: "incorrect_control", unit: "C", value: "0" }]
    })
  });
  const response = await server.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "Incorrect control config on device.");
  assert(!(await kv.get(["connected", "456"])).value);
});

Deno.test("DEVICE /connect - Successful device connection", async () => {
  const request = new Request("http://localhost:7777/connect/456", {
    method: "POST",
    body: JSON.stringify({
      sensors: Object.values(system.devices["456"].sensors),
      controls: Object.values(system.devices["456"].controls),
    })
  });
  const response = await server.requestHandler(request);

  assert(response.status === 200);
  const responseBody = await response.json();

  assert(typeof responseBody.polling_interval === "number");
  assert(typeof responseBody.last_poll === "number");
  await new Promise(res => setTimeout(res, 1)); // delay for non-blocked KV write
  assert((await kv.get(["connected", "456"])).value);
});

Deno.test("DEVICE /sense - Device not found", async () => {
  const request = new Request("http://localhost:7777/sense/this-isnt-an-id", {
    method: "POST"
  });
  const response = await server.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "No device with matching id found.");
});

Deno.test("DEVICE /sense - Device not connected", async () => {
  const request = new Request("http://localhost:7777/sense/123", {
    method: "POST",
    body: JSON.stringify([])
  });
  const response = await server.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "Device not connected.");
});

Deno.test("DEVICE /sense - Device already polled this interval", async () => {
  const deviceId = "456";
  await kv.set(["connected", deviceId], Date.now());

  const request = new Request(`http://localhost:7777/sense/${deviceId}`, {
    method: "POST",
    body: JSON.stringify([])
  });
  const request2 = new Request(`http://localhost:7777/sense/${deviceId}`, {
    method: "POST",
    body: JSON.stringify([])
  });
  const response = await server.requestHandler(request);
  await new Promise(res => setTimeout(res, 100));
  const response2 = await server.requestHandler(request2);
  assert(response.status === 200);
  assert(response2.status === 400);
  assert(await response2.text() === "Device already polled sense this interval.");
});

Deno.test("DEVICE /sense - Successful device sense and control", async () => {
  const deviceId = "456";
  await kv.set(["connected", deviceId], Date.now() - system.polling_interval/2);
  await kv.set(["last_poll", ""], Date.now() - system.polling_interval - 50);
  await kv.set(["state", deviceId], system.devices["456"]);

  const request = new Request(`http://localhost:7777/sense/${deviceId}`, {
    method: "POST",
    body: JSON.stringify(system.devices["456"].sensors)
  });
  const response = await server.requestHandler(request);

  assert(response.status === 200);
  const responseBody = await response.json();

  assert(Array.isArray(responseBody.actions));
  assert(typeof responseBody.last_poll === "number");
  assert(typeof responseBody.polling_interval === "number");
  await new Promise(res => setTimeout(res, 1)); // delay for non-blocked KV write
  assert((await kv.get(["state", deviceId])).value);
});

Deno.test("DEVICE /control - Device not found", async () => {
  const request = new Request("http://localhost:7777/control/this-isnt-an-id", {
    method: "POST"
  });
  const response = await server.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "No device with matching id found.");
});

Deno.test("DEVICE /control - Device not connected", async () => {
  const request = new Request("http://localhost:7777/control/123", {
    method: "POST",
    body: JSON.stringify([])
  });
  const response = await server.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "Device not connected.");
});

Deno.test("DEVICE /control - Successful device control", async () => {
  const deviceId = "456";
  await kv.set(["connected", deviceId], Date.now() - system.polling_interval - 100);

  const request = new Request(`http://localhost:7777/control/${deviceId}`, {
    method: "POST",
    body: JSON.stringify({
      controls: Object.values(system.devices["456"].controls)
    })
  });
  const response = await server.requestHandler(request);

  assert(response.status === 200);
  assert(await response.text() === "Ta!");
  await new Promise(res => setTimeout(res, 1)); // delay for non-blocked KV write
  assert((await kv.get(["state", deviceId])).value);
});
