import { loadAll } from "js-yaml";
import { readFile } from "@kosko/system-utils";
import { getResourceModule, ResourceKind } from "./module";
import Debug from "./debug";
import { importPath } from "@kosko/require";

const debug = Debug.extend("load");

export interface Manifest extends ResourceKind {
  [key: string]: any;
}

type ManifestConstructor = new (data: Manifest) => Manifest;

export interface LoadOptions {
  transform?(manifest: Manifest): Manifest | null | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && !Array.isArray(value);
}

function isManifest(value: Record<string, unknown>): value is Manifest {
  return (
    typeof value.apiVersion === "string" &&
    !!value.apiVersion &&
    typeof value.kind === "string" &&
    !!value.kind
  );
}

async function getConstructor(
  res: ResourceKind
): Promise<ManifestConstructor | undefined> {
  const mod = await getResourceModule(res);

  if (!mod) {
    debug("No resource modules for", res);
    return;
  }

  try {
    const result = await importPath(mod.path);
    return result[mod.export];
  } catch {
    debug("Failed to import the resource module", mod);
    return;
  }
}

/**
 * Load a Kubernetes YAML file from a string.
 */
export async function loadString(
  content: string,
  { transform = (x) => x }: LoadOptions = {}
): Promise<readonly Manifest[]> {
  const input = loadAll(content).filter((x) => x != null);
  const manifests: Manifest[] = [];

  for (const entry of input) {
    if (!isRecord(entry)) {
      throw new Error(`The value must be an object: ${JSON.stringify(entry)}`);
    }

    if (!isManifest(entry)) {
      throw new Error(
        `apiVersion and kind are required: ${JSON.stringify(entry)}`
      );
    }

    const Constructor = await getConstructor(entry);
    const manifest = transform(Constructor ? new Constructor(entry) : entry);

    if (manifest) {
      manifests.push(manifest);
    }
  }

  return manifests;
}

/**
 * Load a Kubernetes YAML file from path.
 *
 * @param path Path to the Kubernetes YAML file.
 * @param options
 */
export function loadFile(path: string, options?: LoadOptions) {
  return async (): Promise<readonly Manifest[]> => {
    const content = await readFile(path);
    debug("File loaded from: %s", path);

    return loadString(content, options);
  };
}

/**
 * Load a Kubernetes YAML file from url.
 *
 * @param url URL to the Kubernetes YAML file.
 * @param options [Options](https://github.com/node-fetch/node-fetch#options) for the HTTP(S) request.
 */
export function loadUrl(
  url: RequestInfo,
  options: LoadOptions & RequestInit = {}
): () => Promise<readonly Manifest[]> {
  const { transform, ...init } = options;

  return async () => {
    const res = await fetch(url, init);
    debug(`Fetch "%s": status=%d`, url, res.status);

    if (!res.ok) {
      throw new Error(`Failed to fetch YAML file from: ${url}`);
    }

    return loadString(await res.text(), { transform });
  };
}
