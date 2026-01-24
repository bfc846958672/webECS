import type { Engine } from "../engine/Engine.ts";
import { Transform } from "../components/Transform.ts";
import { Rect } from "../components/render/Rect.ts";
import { Circle } from "../components/render/Circle.ts";
import { Line } from "../components/render/Line.ts";
import { Point } from "../components/render/Point.ts";
import { Polyline } from "../components/render/Polyline.ts";
import { Curve } from "../components/render/Curve.ts";
import { Path } from "../components/render/Path.ts";
import { Image } from "../components/render/Image.ts";
import { Text } from "../components/render/Text.ts";
import { EventComponent } from "../components/Event.ts";
import { SceneNode } from "../scene/SceneTree.ts";

export type DrawInstance<TShape> = {
  id: number;
  transform: Transform;
  /** 兼容用户写法：rect.trasform */
  trasform: Transform;
  shape: TShape;
  event: EventComponent;
};

export class Draw {
  constructor(private engine: Engine) {}

  private create<TShape>(shape: TShape, transform: Transform): SceneNode {
    const node = new SceneNode();
    const entityId = node.entityId;
    const event = new EventComponent();
    this.engine.ecs.addComponent(entityId, shape as any);
    this.engine.ecs.addComponent(entityId, transform);
    this.engine.ecs.addComponent(entityId, event);
    // attach convenience properties to keep backward compatibility with examples
    (node as any).id = entityId;
    (node as any).transform = transform;
    (node as any).event = event;
    (node as any).shape = shape;
    return node;
  }

  rect(pos: Partial<Transform> = {}, props: Partial<Rect> = {}) {
    return this.create(new Rect(props), new Transform(pos));
  }

  circle(pos: Partial<Transform> = {}, props: Partial<Circle> = {}) {
    return this.create(new Circle(props), new Transform(pos));
  }

  /** Line 组件是 points 列表（折线） */
  line(pos: Partial<Transform> = {}, props: Partial<Line> = {}) {
    return this.create(new Line(props), new Transform(pos));
  }

  point(pos: Partial<Transform> = {}, props: Partial<Point> = {}) {
    return this.create(new Point(props), new Transform(pos));
  }

  polyline(pos: Partial<Transform> = {}, props: Partial<Polyline> = {}) {
    return this.create(new Polyline(props), new Transform(pos));
  }

  curve(pos: Partial<Transform> = {}, props: Partial<Curve> = {}) {
    return this.create(new Curve(props), new Transform(pos));
  }

  path(pos: Partial<Transform> = {}, props: Partial<Path> = {}) {
    return this.create(new Path(props), new Transform(pos));
  }

  image(pos: Partial<Transform> = {}, props: Partial<Image> = {}) {
    return this.create(new Image(props), new Transform(pos));
  }

  text(pos: Partial<Transform> = {}, props: Partial<Text> = {}) {
    return this.create(new Text(props), new Transform(pos));
  }
}
