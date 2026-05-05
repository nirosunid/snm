import type { Access } from "payload";

/** Collection-level: unrestricted public access. */
export const publicAccess: Access = () => true;

/** Collection-level: no access for anyone. */
export const noAccess: Access = () => false;
