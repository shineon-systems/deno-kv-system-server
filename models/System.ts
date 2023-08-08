
import { system } from "../tests/mocks/System.ts";

export const loadSystem = (request: Request) => {
  // system should be loaded from user token (free tier - browser storage)
  // or database (premium tier - cloud storage)

  return system;
}