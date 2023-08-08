import { assert } from "https://deno.land/std@0.195.0/testing/asserts.ts";
import router from "../router.ts";
import { system } from "./mocks/System.ts";

const kv = await Deno.openKv();
for await (const entry of kv.list({ prefix: ["connected"] })) {
  await kv.delete(entry.key)
}
for await (const entry of kv.list({ prefix: ["state"] })) {
  await kv.delete(entry.key)
}

Deno.test("DEVICE /connect - Device not found", async () => {
  const request = new Request("http://localhost:7777/connect/this-isnt-an-id", {
    method: "POST"
  });
  const response = await router.requestHandler(request);

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
  const response = await router.requestHandler(request);

  const text = await response.text()

  assert(response.status === 400);
  assert(text === "Incorrect sensor config on device.");
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
  const response = await router.requestHandler(request);

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
  const response = await router.requestHandler(request);
  // console.log(response)
  assert(response.status === 200);
  const responseBody = await response.json();

  assert(typeof responseBody.polling_interval === "number");
  assert(typeof responseBody.last_poll === "number");
  await new Promise(res => setTimeout(res, 1)); // delay for non-blocked KV write
  assert((await kv.get(["connected", "456"])).value as number > Date.now() - 100);
});

Deno.test("DEVICE /sense - Device not found", async () => {
  const request = new Request("http://localhost:7777/sense/this-isnt-an-id", {
    method: "POST"
  });
  const response = await router.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "No device with matching id found.");
});

Deno.test("DEVICE /sense - Device not connected", async () => {
  const request = new Request("http://localhost:7777/sense/123", {
    method: "POST",
    body: JSON.stringify([])
  });
  const response = await router.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "Device not connected.");
});

Deno.test("DEVICE /sense - Successful device sense and control, single device request", async () => {
  const deviceId = "456";
  const request = new Request(`http://localhost:7777/sense/${deviceId}`, {
    method: "POST",
    body: JSON.stringify(system.devices[deviceId].sensors)
  });
  const response = await router.requestHandler(request);

  console.log(await response.text());
  assert(response.status === 200);
  const responseBody = await response.json();

  assert(Array.isArray(responseBody.actions));
  assert(typeof responseBody.last_poll === "number");
  assert(typeof responseBody.polling_interval === "number");
  await new Promise(res => setTimeout(res, 1)); // delay for non-blocked KV write
  console.log((await kv.get(["state", deviceId])).value);
  assert((await kv.get(["state", deviceId])).value);
});

Deno.test("DEVICE /sense - Successful device sense and control, double device request", async () => {
  const deviceIds = ["123", "456"];
  const responses = await Promise.all(
    deviceIds.map(async deviceId => {
      const request = new Request(`http://localhost:7777/sense/${deviceId}`, {
        method: "POST",
        body: JSON.stringify(system.devices[deviceId].sensors)
      });
      return await router.requestHandler(request);
    })
  );

  assert(responses.every(response => response.status === 200));
  const responseBodies = await Promise.all(responses.map(response => response.json()));

  assert(responseBodies.every(responseBody => Array.isArray(responseBody.actions)));
  assert(responseBodies.every(responseBody => typeof responseBody.last_poll === "number"));
  assert(responseBodies.every(responseBody => typeof responseBody.polling_interval === "number"));
  await new Promise(res => setTimeout(res, 1)); // delay for non-blocked KV write
  assert(deviceIds.every(async deviceId => (await kv.get(["state", deviceId])).value));
});


Deno.test("DEVICE /sense - Device already polled this interval", async () => {
  const deviceId = "456";
  const request = new Request(`http://localhost:7777/sense/${deviceId}`, {
    method: "POST",
    body: JSON.stringify(system.devices["456"].sensors)
  });
  const response = await router.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "Device already polled sense this interval.");
});

Deno.test("DEVICE /control - Device not found", async () => {
  const request = new Request("http://localhost:7777/control/this-isnt-an-id", {
    method: "POST"
  });
  const response = await router.requestHandler(request);

  assert(response.status === 400);
  assert(await response.text() === "No device with matching id found.");
});

Deno.test("DEVICE /control - Device not connected", async () => {
  const request = new Request("http://localhost:7777/control/123", {
    method: "POST",
    body: JSON.stringify([])
  });
  const response = await router.requestHandler(request);

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
  const response = await router.requestHandler(request);

  assert(response.status === 200);
  assert(await response.text() === "Ta!");
  await new Promise(res => setTimeout(res, 1)); // delay for non-blocked KV write
  assert((await kv.get(["state", deviceId])).value);
});
