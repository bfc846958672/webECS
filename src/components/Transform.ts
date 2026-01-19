import { IComponent } from "./IComponent.ts";
import { Component } from "./Component.ts";
import { mat3 } from "gl-matrix";
export class Transform extends Component implements IComponent {
  #x = 0;
  #y = 0;
  #scaleX = 1;
  #scaleY = 1;
  #rotation = 0;
  #skewX = 0;
  #skewY = 0;
  #pivotX = 0;
  #pivotY = 0;

  localMatrix = mat3.create();
  worldMatrix = mat3.create();
  dirty = true;
  constructor(params: Partial<Transform> = {}) {
    super();
    const keys = ["x", "y", "scaleX", "scaleY", "rotation", "skewX", "skewY", "pivotX", "pivotY"] as const;
    for (const key of keys) {
      if (params[key] !== undefined) { this[key] = params[key]!; }
    }
  }

  get x() { return this.#x; }
  set x(v: number) { this.#x = v; this.dirty = true; }

  get y() { return this.#y; }
  set y(v: number) { this.#y = v; this.dirty = true; }

  get scaleX() { return this.#scaleX; }
  set scaleX(v: number) { this.#scaleX = v; this.dirty = true; }

  get scaleY() { return this.#scaleY; }
  set scaleY(v: number) { this.#scaleY = v; this.dirty = true; }

  get rotation() { return this.#rotation; }
  set rotation(v: number) { this.#rotation = v; this.dirty = true; }

  get skewX() { return this.#skewX; }
  set skewX(v: number) { this.#skewX = v; this.dirty = true; }

  get skewY() { return this.#skewY; }
  set skewY(v: number) { this.#skewY = v; this.dirty = true; }

  get pivotX() { return this.#pivotX; }
  set pivotX(v: number) { this.#pivotX = v; this.dirty = true; }

  get pivotY() { return this.#pivotY; }
  set pivotY(v: number) { this.#pivotY = v; this.dirty = true; }
}
