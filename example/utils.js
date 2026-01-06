import { Engine, Components, loadImageBitmap, Polyline } from './dist/web-ecs.es.js';
const { Transform, Rect, Circle, EventComponent, Image, Curve, Path } = Components;
const canvas = document.getElementById("game-canvas");
export { Transform }
export { loadImageBitmap }
export const engine = new Engine(canvas);
export const CircleApi = (obj, con, { skewX = 0, skewY = 0, scaleX = 1, scaleY = 1, rotation = 0 } = {}, pivot = null) => {
   const circle = engine.ecs.createEntity();
   const transform = new Transform(engine, { x: 0, y: 0, ...obj });
   skewX && (transform.skewX = skewX);
   skewY && (transform.skewY = skewY);
   scaleX && (transform.scaleX = scaleX);
   scaleY && (transform.scaleY = scaleY);
   if (rotation) {
      transform.rotation = rotation;
   }
   const defaultCircleConfig = { radius: 50, fillStyle: "#e74c3c", strokeStyle: "#000", lineWidth: 2, alpha: 0.9, ...con }
   const circleComponent = new Circle(engine, defaultCircleConfig);
   engine.ecs.addComponent(circle, circleComponent);
   engine.ecs.addComponent(circle, transform);
   if (pivot) {
      pivot.x && (transform.pivotX = pivot.x);
      pivot.y && (transform.pivotY = pivot.y);
   }
   return circle;
}

export const RectApi = (obj, con, { skewX = 0, skewY = 0, scaleX = 1, scaleY = 1, rotation = 0 } = {}, pivot = null) => {
   const rect = engine.ecs.createEntity();
   const transform = new Transform(engine, { x: 100, y: 0, ...obj });
   const defaultRectConfig = { width: 200, height: 100, fillStyle: "#e74c3c", strokeStyle: "#000", lineWidth: 2, alpha: 0.9, ...con }
   const rectComponent = new Rect(engine, defaultRectConfig);
   engine.ecs.addComponent(rect, rectComponent);
   engine.ecs.addComponent(rect, transform);
   skewX && (transform.skewX = skewX);
   skewY && (transform.skewY = skewY);
   scaleX && (transform.scaleX = scaleX);
   scaleY && (transform.scaleY = scaleY);
   if (rotation) {
      transform.rotation = rotation;
   }
   if (pivot) {
      pivot.x && (transform.pivotX = pivot.x);
      pivot.y && (transform.pivotY = pivot.y);
   }
   return rect;
}

export const bindEvent = (entity, type, callback) => {
   const eventComponent = new EventComponent(engine);
   engine.ecs.addComponent(entity, eventComponent);
   return eventComponent
}

export const ImageApi = (obj, con, { skewX = 0, skewY = 0, scaleX = 1, scaleY = 1, rotation = 0 } = {}, pivot = null) => {
   const image = engine.ecs.createEntity();
   const transform = new Transform(engine, { x: 0, y: 0, ...obj });
   skewX && (transform.skewX = skewX);
   skewY && (transform.skewY = skewY);
   scaleX && (transform.scaleX = scaleX);
   scaleY && (transform.scaleY = scaleY);
   if (rotation) {
      transform.rotation = rotation;
   }
   if (pivot) {
      pivot.x && (transform.pivotX = pivot.x);
      pivot.y && (transform.pivotY = pivot.y);
   }
   const defaultImageConfig = { bitmap: null, fillStyle: "#e74c3c", strokeStyle: "#000",  alpha: 0.9, ...con }
   const imageComponent = new Image(engine, defaultImageConfig);
   engine.ecs.addComponent(image, imageComponent);
   engine.ecs.addComponent(image, transform);
   return image;
}

export const PolylineApi = (obj, con, { skewX = 0, skewY = 0, scaleX = 1, scaleY = 1, rotation = 0 } = {}, pivot = null) => {
   const polyline = engine.ecs.createEntity();
   const transform = new Transform(engine, { x: 0, y: 0, ...obj });
   skewX && (transform.skewX = skewX);
   skewY && (transform.skewY = skewY);
   scaleX && (transform.scaleX = scaleX);
   scaleY && (transform.scaleY = scaleY);
   if (rotation) {
      transform.rotation = rotation;
   }
   if (pivot) {
      pivot.x && (transform.pivotX = pivot.x);
      pivot.y && (transform.pivotY = pivot.y);
   }
   const defaultPolylineConfig = { points: [], closed: false, fillStyle: "#e74c3c", strokeStyle: "#000", lineWidth: 2, alpha: 0.9, ...con }
   const polylineComponent = new Polyline(engine, defaultPolylineConfig);
   engine.ecs.addComponent(polyline, polylineComponent);
   engine.ecs.addComponent(polyline, transform);
   return polyline;
}

export const CurveApi = (obj, con, { skewX = 0, skewY = 0, scaleX = 1, scaleY = 1, rotation = 0 } = {}, pivot = null) => {
   const curve = engine.ecs.createEntity();
   const transform = new Transform(engine, { x: 0, y: 0, ...obj });
   skewX && (transform.skewX = skewX);
   skewY && (transform.skewY = skewY);
   scaleX && (transform.scaleX = scaleX);
   scaleY && (transform.scaleY = scaleY);
   if (rotation) {
      transform.rotation = rotation;
   }
   if (pivot) {
      pivot.x && (transform.pivotX = pivot.x);
      pivot.y && (transform.pivotY = pivot.y);
   }
   const defaultCurveConfig = {  fillStyle: "#e74c3c", strokeStyle: "#000", lineWidth: 2, alpha: 0.9, ...con }     
   const curveComponent = new Curve(engine, defaultCurveConfig);
   engine.ecs.addComponent(curve, curveComponent);
   engine.ecs.addComponent(curve, transform);
   return curve;
}

export const PathApi = (obj, con, { skewX = 0, skewY = 0, scaleX = 1, scaleY = 1, rotation = 0 } = {}, pivot = null) => {
   const path = engine.ecs.createEntity();
   const transform = new Transform(engine, { x: 0, y: 0, ...obj });
   skewX && (transform.skewX = skewX);
   skewY && (transform.skewY = skewY);
   scaleX && (transform.scaleX = scaleX);
   scaleY && (transform.scaleY = scaleY);
   if (rotation) {
      transform.rotation = rotation;
   }
   if (pivot) {
      pivot.x && (transform.pivotX = pivot.x);
      pivot.y && (transform.pivotY = pivot.y);
   }
   const defaultPathConfig = {   strokeStyle: "#000", lineWidth: 2, alpha: 0.9, ...con }     
   const pathComponent = new Path(engine, defaultPathConfig);
   engine.ecs.addComponent(path, pathComponent);
   engine.ecs.addComponent(path, transform);
   return path;
}
