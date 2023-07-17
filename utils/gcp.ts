import { Crypto } from "https://deno.land/x/peko@1.9.0/mod.ts";

let gcloud
if (Deno.env.get("DENO_REGION")) {
  const {
    gcp_private_key,
    gcp_client_email
  } = Deno.env.toObject()
  gcloud = { 
    private_key: gcp_private_key,
    client_email: gcp_client_email
  }
} else {
  gcloud = (await import(new URL(`../keys/gcp.json`, import.meta.url).pathname, {
    assert: { type: "json" },
  })).default
}

const gCrypto = new Crypto(gcloud.private_key, { name: "RSA", hash: "SHA-256" })

const service_payload = {
  "iss": gcloud.client_email,
  "scope": "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/devstorage.full_control",
  "aud": "https://oauth2.googleapis.com/token",
  "exp": Date.now()/1000 + 3600,
  "iat": Date.now()/1000
}

let access_creds = { access_token: '', dob: 0, expires_in: 0 };

export const getAccess = async () => {
  if (access_creds.access_token && Date.now() < access_creds.dob + access_creds.expires_in * 1000) {
    return access_creds
  }

  service_payload.exp = Date.now()/1000 + 3600
  service_payload.iat = Date.now()/1000

  const service_jwt = await gCrypto.sign(service_payload)

  const access_response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: JSON.stringify({
      "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "assertion": service_jwt
    })
  })

  access_creds = await access_response.json()

  return access_creds
}

export const POST2Sheet = (state: unknown) => {
  fetch(`https://sheets.googleapis.com/v4/spreadsheets/1vta1Wd62aMtHYvnfWa3M_FY-QM0vMHMppIr7C-zzIY0/values/Sheet1!A1:B1:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + access_creds.access_token
    },
    body: JSON.stringify({
      "range": "Sheet1!A1:B1",
      "majorDimension": "ROWS",
      "values": [
        [
          new Date().toISOString(),
          JSON.stringify(state)
        ],
      ],
    })
  })
}
