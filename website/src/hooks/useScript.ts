import { useState, useEffect } from "react";

export enum ScriptLoadStatus {
  Idle = "idle",
  Loading = "loading",
  Ready = "ready",
  Error = "error"
}

// Source: https://usehooks.com/useScript/
export default function useScript(src: string): ScriptLoadStatus {
  // Keep track of script status ("idle", "loading", "ready", "error")
  const [status, setStatus] = useState<ScriptLoadStatus>(
    src ? ScriptLoadStatus.Loading : ScriptLoadStatus.Idle
  );

  useEffect(
    () => {
      // Allow falsy src value if waiting on other data needed for
      // constructing the script URL passed to this hook.
      if (!src) {
        setStatus(ScriptLoadStatus.Idle);
        return;
      }

      // Fetch existing script element by src
      // It may have been added by another intance of this hook
      let script: HTMLScriptElement = document.querySelector(
        `script[src="${src}"]`
      );

      if (!script) {
        // Create script
        script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.setAttribute("data-status", ScriptLoadStatus.Loading);
        // Add script to document body
        document.body.appendChild(script);

        // Store status in attribute on script
        // This can be read by other instances of this hook
        const setAttributeFromEvent = (event) => {
          script.setAttribute(
            "data-status",
            event.type === "load"
              ? ScriptLoadStatus.Ready
              : ScriptLoadStatus.Error
          );
        };

        script.addEventListener("load", setAttributeFromEvent);
        script.addEventListener("error", setAttributeFromEvent);
      } else {
        // Grab existing script status from attribute and set to state.
        setStatus(script.getAttribute("data-status") as ScriptLoadStatus);
      }

      // Script event handler to update status in state
      // Note: Even if the script already exists we still need to add
      // event handlers to update the state for *this* hook instance.
      const setStateFromEvent = (event) => {
        setStatus(
          event.type === "load"
            ? ScriptLoadStatus.Ready
            : ScriptLoadStatus.Error
        );
      };

      // Add event listeners
      script.addEventListener("load", setStateFromEvent);
      script.addEventListener("error", setStateFromEvent);

      // Remove event listeners on cleanup
      return () => {
        if (script) {
          script.removeEventListener("load", setStateFromEvent);
          script.removeEventListener("error", setStateFromEvent);
        }
      };
    },
    [src] // Only re-run effect if script src changes
  );

  return status;
}
