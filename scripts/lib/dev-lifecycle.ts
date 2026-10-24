/**
 * Process and port lifecycle helpers for the local development launcher.
 * Extracted so SIGTERM/SIGINT cleanup and port-release behaviour can be tested without
 * starting PostgreSQL or Next.js.
 */

import { type ChildProcess, type SpawnOptions, spawn } from "node:child_process";
import { createServer } from "node:net";
import { createConnection } from "node:net";

export type StoppableResource = {
  stop: () => void | Promise<void>;
};

export class OwnedProcessRegistry {
  private readonly children = new Set<ChildProcess>();

  track(child: ChildProcess | null | undefined): ChildProcess | null {
    if (!child) return null;
    this.children.add(child);
    child.once("exit", () => {
      this.children.delete(child);
    });
    return child;
  }

  list(): ChildProcess[] {
    return [...this.children];
  }

  async signalAll(signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
    const pending: Promise<void>[] = [];
    for (const child of [...this.children]) {
      pending.push(
        new Promise((resolve) => {
          if (child.killed || child.exitCode !== null) {
            this.children.delete(child);
            resolve();
            return;
          }
          const done = () => {
            this.children.delete(child);
            resolve();
          };
          child.once("exit", done);
          try {
            child.kill(signal);
          } catch {
            done();
          }
        }),
      );
    }
    await Promise.all(pending);
  }
}

export function spawnOwned(
  registry: OwnedProcessRegistry,
  command: string,
  args: readonly string[],
  options: SpawnOptions,
): ChildProcess {
  const child = spawn(command, args, options);
  registry.track(child);
  return child;
}

export function assertPortFree(port: number, label: string, host = "127.0.0.1"): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `${label} port ${port} is already in use. Stop the other process or set a different DEV_*_PORT. This launcher will not kill another process.`,
          ),
        );
        return;
      }
      reject(error);
    });
    server.once("listening", () => {
      server.close((closeError) => {
        if (closeError) reject(closeError);
        else resolve();
      });
    });
    server.listen(port, host);
  });
}

export function isPortListening(port: number, host = "127.0.0.1", timeoutMs = 250): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    const finish = (value: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function waitForPortState(
  port: number,
  listening: boolean,
  {
    host = "127.0.0.1",
    timeoutMs = 10_000,
    intervalMs = 50,
  }: { host?: string; timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const open = await isPortListening(port, host);
    if (open === listening) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `Timed out waiting for port ${port} to become ${listening ? "listening" : "free"} on ${host}.`,
  );
}

export async function findFreePort(host = "127.0.0.1"): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate an ephemeral port."));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

/**
 * Stop launcher-owned children and optional stoppable resources (embedded DB, tunnel proxy).
 * Does not call process.exit — callers decide. Never signals processes outside the registry.
 */
export async function stopLauncherResources(options: {
  registry: OwnedProcessRegistry;
  resources?: StoppableResource[];
  signal?: NodeJS.Signals;
}): Promise<void> {
  const { registry, resources = [], signal = "SIGTERM" } = options;
  for (const resource of resources) {
    try {
      await resource.stop();
    } catch {
      // ignore individual resource stop failures; continue cleaning others
    }
  }
  await registry.signalAll(signal);
}
