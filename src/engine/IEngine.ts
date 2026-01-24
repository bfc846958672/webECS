export interface IEngine {
  start: () => void;
  stop: () => void;
}

export interface IEngineOption {
  autoResize?: boolean;
  performance?: boolean;
}