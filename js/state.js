(function () {
  class SystemState {
    constructor() {
      if (window.SystemState) {
        return window.SystemState;
      }

      this.storageKey = "sf_state";
      this.defaultState = {
        score: 0,
        history: [],
        profile: "unknown",
        role: "operator",
        priority: "normal",
        signal: "initial",
        email: "",
        low_confidence_identity: false,
        session_start: Date.now(),
        last_update: Date.now()
      };

      this.state = this.loadState();
      window.addEventListener("storage", this.handleExternalSync.bind(this));
      window.SystemState = this;
    }

    loadState() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...this.defaultState, ...parsed };
        }
      } catch (error) {
        console.warn("SystemState failed to load state:", error);
      }
      this.persistState(this.defaultState);
      return { ...this.defaultState };
    }

    persistState(state) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
      } catch (error) {
        console.warn("SystemState failed to persist state:", error);
      }
    }

    emit(eventName, detail = {}) {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    get(key) {
      if (typeof key === "undefined") {
        return { ...this.state };
      }
      return this.state[key];
    }

    getState() {
      return this.get();
    }

    update(partial) {
      if (typeof partial !== "object" || partial === null) {
        return this.get();
      }
      this.state = {
        ...this.state,
        ...partial,
        last_update: Date.now()
      };
      this.persistState(this.state);
      Object.keys(partial).forEach((key) => {
        this.emit("systemstate:changed", { key, value: this.state[key], state: this.get() });
        this.emit(`systemstate:changed:${key}`, { value: this.state[key], state: this.get() });
      });
      return this.get();
    }

    set(key, value) {
      const current = this.state[key];
      if (current === value) {
        return value;
      }

      this.state = {
        ...this.state,
        [key]: value,
        last_update: Date.now()
      };

      this.persistState(this.state);
      this.emit("systemstate:changed", { key, value, state: this.get() });
      this.emit(`systemstate:changed:${key}`, { value, state: this.get() });
      return value;
    }

    pushEvent(eventName) {
      const history = Array.isArray(this.state.history) ? [...this.state.history] : [];
      history.push({ event: eventName, time: Date.now() });
      if (history.length > 50) {
        history.shift();
      }
      this.set("history", history);
      this.emit("systemstate:event", { event: eventName, history: this.get("history") });
      return this.get("history");
    }

    merge(newState) {
      this.state = {
        ...this.state,
        ...newState,
        last_update: Date.now()
      };
      this.persistState(this.state);
      this.emit("systemstate:merged", { state: this.get() });
      return this.get();
    }

    clear() {
      this.state = {
        ...this.defaultState,
        session_start: Date.now(),
        last_update: Date.now()
      };
      this.persistState(this.state);
      this.emit("systemstate:cleared", { state: this.get() });
      return this.get();
    }

    on(eventName, callback) {
      window.addEventListener(eventName, callback);
    }

    handleExternalSync(event) {
      if (event.key !== this.storageKey) {
        return;
      }
      if (!event.newValue) {
        return;
      }
      try {
        const remote = JSON.parse(event.newValue);
        if (JSON.stringify(remote) === JSON.stringify(this.state)) {
          return;
        }

        this.state = { ...this.state, ...remote };
        this.emit("systemstate:storage:sync", { state: this.get() });
        this.emit("systemstate:changed", { key: "storage_sync", value: remote, state: this.get() });
      } catch (error) {
        console.warn("SystemState failed to sync state from storage event:", error);
      }
    }
  }

  window.SystemState = window.SystemState || new SystemState();
})();
