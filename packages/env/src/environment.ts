import { join } from "path";
import { requireDefault } from "@kosko/require";
import Debug from "debug";
import { merge } from "./merge";
import { Paths, formatPath } from "./paths";

const debug = Debug("kosko:env");

function tryRequire(id: string): any {
  try {
    return requireDefault(id);
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      debug("Module not found:", id);
      return {};
    }

    throw err;
  }
}

/**
 * Describes a step in the variables overriding chain.
 */
export interface Reducer {
  /**
   * Name of the reducer.
   */
  name: string;

  /**
   * Overrides variables for the specified component.
   * If component name is not specified then overrides only
   * global variables.
   */
  reduce(
    target: Record<string, any>,
    componentName?: string
  ): Record<string, any>;
}

export class Environment {
  private reducers: Reducer[] = [];

  public env?: string | string[];
  public paths: Paths = {
    global: "environments/#{environment}",
    component: "environments/#{environment}/#{component}"
  };

  public constructor(public cwd: string) {
    this.resetReducers();
  }

  /**
   * Returns global variables.
   *
   * If env is not set or require failed, returns an empty object.
   */
  public global(): any {
    return this.reducers.reduce(
      (target, reducer) => reducer.reduce(target),
      {}
    );
  }

  /**
   * Returns component variables merged with global variables.
   *
   * If env is not set or require failed, returns an empty object.
   *
   * @param name Component name
   */
  public component(name: string): any {
    return this.reducers.reduce(
      (target, reducer) => reducer.reduce(target, name),
      {}
    );
  }

  /**
   * Sets list of reducers using the specified callback function.
   */
  public setReducers(callbackfn: (reducers: Reducer[]) => Reducer[]): void {
    this.reducers = callbackfn([...this.reducers]);
  }

  /**
   * Resets reducers to the defaults.
   */
  public resetReducers(): void {
    this.setReducers(() => [
      this.createGlobalReducer(),
      this.createComponentReducer()
    ]);
  }

  private createGlobalReducer(): Reducer {
    const reducer: Reducer = {
      name: "global",
      reduce: (values) =>
        merge(values, ...this.requireAllEnvs(this.paths.global))
    };

    return reducer;
  }

  private createComponentReducer(): Reducer {
    const reducer: Reducer = {
      name: "component",
      reduce: (values, componentName) => {
        if (!componentName) return values;

        return merge(
          values,
          ...this.requireAllEnvs(this.paths.component, componentName)
        );
      }
    };

    return reducer;
  }

  private requireAllEnvs(template: string, component?: string): any[] {
    if (!this.env) return [];

    const envs = Array.isArray(this.env) ? this.env : [this.env];

    return envs.map((env) => {
      const path = formatPath(template, {
        environment: env,
        component
      });

      return tryRequire(join(this.cwd, path));
    });
  }
}
