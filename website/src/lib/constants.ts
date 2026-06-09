import { readFileSync } from "fs";

const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export const normalizedBase = basePath;
export const version = readFileSync("../version.txt", "utf-8").trim();
export const githubUrl = "https://github.com/lguzzon/runcmd";
export const scriptHref = `${basePath}/runcmd.sh`;
