// Locally the Kernel workspace sets KERNEL_PORT. CI uses 3000.
export const port = Number(process.env.KERNEL_PORT ?? process.env.PORT ?? 3000);
export const baseURL = `http://localhost:${port}`;
// A second dev server signed in as a parent (see playwright.config.ts).
export const parentPort = port + 1;
export const parentURL = `http://localhost:${parentPort}`;
