class De {
  nextId = 0;
  entities = /* @__PURE__ */ new Set();
  /** 创建实体 */
  createEntity() {
    const t = this.nextId++;
    return this.entities.add(t), t;
  }
  /** 删除实体 */
  removeEntity(t) {
    this.entities.delete(t);
  }
  /** 是否存在 */
  hasEntity(t) {
    return this.entities.has(t);
  }
  /** 获取所有实体 */
  getAllEntities() {
    return Array.from(this.entities);
  }
}
class $e {
  // 每种组件类型对应一个 Map<entityId, component>
  componentsByType = /* @__PURE__ */ new Map();
  /** 添加组件 */
  addComponent(t, e) {
    const r = e.constructor;
    let n = this.componentsByType.get(r);
    n || (n = /* @__PURE__ */ new Map(), this.componentsByType.set(r, n)), n.set(t, e);
  }
  /** 移除组件 */
  removeComponent(t, e) {
    this.componentsByType.get(e)?.delete(t);
  }
  /** 获取组件 */
  getComponent(t, e) {
    return this.componentsByType.get(e)?.get(t);
  }
  /** 获取拥有该组件的所有实体 */
  getEntitiesWithComponent(t) {
    const e = this.componentsByType.get(t);
    return e ? Array.from(e.keys()) : [];
  }
  /** 检查实体是否有该组件 */
  hasComponent(t, e) {
    return this.componentsByType.get(e)?.has(t) ?? !1;
  }
}
const fe = /* @__PURE__ */ new Map();
class je {
  /** 实体ID数组 */
  entities = [];
  /** 组件类型集合（固定） */
  componentTypes;
  /** 列式存储：组件类型 -> 对应组件实例数组 */
  columns = /* @__PURE__ */ new Map();
  constructor(t) {
    this.componentTypes = t;
    for (const e of t)
      this.columns.set(e, []);
  }
  /**
   * 添加实体及对应组件实例
   * @param entityId 实体ID
   * @param components Map<组件类, 组件实例>，必须包含该 Archetype 的所有组件
   */
  add(t, e) {
    this.entities.push(t);
    for (const r of this.componentTypes) {
      const n = this.columns.get(r), a = e.get(r);
      if (!a)
        throw new Error(`Missing component ${r.name} for entity ${t}`);
      n.push(a);
    }
  }
  /**
   * 从 Archetype 移除实体及对应组件实例
   */
  remove(t) {
    const e = this.entities.indexOf(t);
    if (e !== -1) {
      this.entities.splice(e, 1);
      for (const r of this.columns.values())
        r.splice(e, 1);
    }
  }
  /**
   * 判断 Archetype 是否包含指定组件集合（子集匹配）
   */
  matches(t) {
    return t.every((e) => this.componentTypes.has(e));
  }
  /**
   * 获取实体对应组件实例
   */
  getComponent(t, e) {
    const r = this.entities.indexOf(t);
    if (r === -1) return;
    const n = this.columns.get(e);
    return n ? n[r] : void 0;
  }
}
class Fe {
  entityArchetypeMap = /* @__PURE__ */ new Map();
  archetypeMap = /* @__PURE__ */ new Map();
  /** 生成组件组合 key */
  getComponentKey(t) {
    return Array.from(t).map((e) => e.name).sort().join("|");
  }
  /** 获取或创建 Archetype */
  getOrCreateArchetype(t) {
    const e = this.getComponentKey(new Set(t.keys()));
    let r = this.archetypeMap.get(e);
    return r || (r = new je(new Set(t.keys())), this.archetypeMap.set(e, r)), r;
  }
  /** 迁移实体到新的 Archetype */
  migrateEntity(t, e) {
    const r = this.entityArchetypeMap.get(t);
    r && r.remove(t);
    const n = this.getOrCreateArchetype(e);
    n.add(t, e), this.entityArchetypeMap.set(t, n);
  }
  /** 获取实体对应的 Archetype */
  getArchetypeOf(t) {
    return this.entityArchetypeMap.get(t);
  }
  /** 查询 Archetypes */
  queryArchetypes(t) {
    const e = this.getComponentKey(new Set(t)), r = this.archetypeMap.get(e);
    return r ? [r] : [];
  }
  /** 删除实体 */
  removeEntity(t) {
    const e = this.entityArchetypeMap.get(t);
    e && e.remove(t), this.entityArchetypeMap.delete(t);
  }
}
class dt {
  #t;
  constructor(t, {} = {}) {
    this.#t = t, this.#t;
  }
}
class Ge {
  // 保证只有一个渲染组件
  renderMap = /* @__PURE__ */ new Map();
  // 实体 ==> 组件映射表
  map = /* @__PURE__ */ new Map();
  // 新增：组件实例 ==> 实体映射
  componentEntityMap = /* @__PURE__ */ new Map();
  getComponentsMap(t) {
    return this.map.get(t);
  }
  isRenderComponent(t) {
    return t instanceof dt;
  }
  addComponent(t, e) {
    this.map.has(t) || this.map.set(t, /* @__PURE__ */ new Map());
    const r = this.map.get(t), n = e.constructor;
    if (this.isRenderComponent(e)) {
      const a = this.renderMap.get(t);
      if (a) {
        const i = r.get(a);
        i && this.componentEntityMap.delete(i), r.delete(a);
      }
      this.renderMap.set(t, n);
    }
    r.set(n, e), this.componentEntityMap.set(e, t);
  }
  removeEntity(t) {
    const e = this.map.get(t);
    if (e)
      for (const r of e.values())
        this.componentEntityMap.delete(r);
    this.map.delete(t), this.renderMap.delete(t);
  }
  removeComponent(t, e) {
    e === dt && this.renderMap.delete(t);
    const r = this.map.get(t);
    if (!r) return;
    const n = r.get(e);
    n && this.componentEntityMap.delete(n), r.delete(e), r.size === 0 && this.map.delete(t);
  }
  getComponent(t, e) {
    return this.map.get(t)?.get(e);
  }
  getComponents(t) {
    return this.map.get(t);
  }
  hasComponent(t, e) {
    return this.map.get(t)?.has(e) ?? !1;
  }
  /** 新增方法：根据组件实例获取所属实体ID */
  getEntityIdByComponent(t) {
    return this.componentEntityMap.get(t);
  }
}
class qe {
  listeners = {};
  /** 注册事件监听 */
  on(t, e) {
    this.listeners[t] || (this.listeners[t] = /* @__PURE__ */ new Set()), this.listeners[t].add(e);
  }
  /** 注销事件监听 */
  off(t, e) {
    const r = this.listeners[t];
    r && (e ? r.delete(e) : delete this.listeners[t]);
  }
  /** 触发事件 */
  emit(t, ...e) {
    const r = this.listeners[t];
    if (r)
      for (const n of r)
        n(...e);
  }
  /** 清空所有事件监听 */
  clear() {
    for (const t in this.listeners)
      delete this.listeners[t];
  }
}
class ze {
  canvas;
  // 挂载 Canvas
  event = new qe();
  entities = new De();
  components = new $e();
  systems = [];
  ComponentRegistry = fe;
  // 简单 Map：实体ID -> 组件名 -> 组件实例
  entityComponents = new Ge();
  archetypeManager = new Fe();
  #t = /* @__PURE__ */ new Map();
  addSystem(t) {
    t.init(this), this.systems.push(t), this.#t.set(t.constructor, t);
  }
  getSystem(t) {
    return this.#t.get(t);
  }
  hasEntity(t) {
    return this.entities.hasEntity(t);
  }
  createEntity() {
    const t = this.entities.createEntity();
    return this.event.emit("create_entity", t), t;
  }
  removeEntity(t) {
    if (!this.hasEntity(t)) throw new Error(`Entity ${t} not exists`);
    this.entities.removeEntity(t), this.entityComponents.removeEntity(t), this.archetypeManager.removeEntity(t);
  }
  update(t) {
    for (const e of this.systems) e.update(t);
  }
  addComponent(t, e) {
    if (!this.hasEntity(t)) throw new Error(`Entity ${t} not exists`);
    const r = Reflect.getMetadata("component:name", e.constructor);
    if (!this.ComponentRegistry.has(r))
      throw new Error(`Component "${r}" is not registered!`);
    this.entityComponents.addComponent(t, e);
    const n = this.entityComponents.getComponentsMap(t);
    this.archetypeManager.migrateEntity(t, n), this.event.emit("add_component", t, e);
  }
  removeComponent(t, e) {
    if (!this.hasEntity(t)) throw new Error(`Entity ${t} not exists`);
    this.entityComponents.removeComponent(t, e);
    const r = this.entityComponents.getComponentsMap(t);
    r && r.size > 0 ? this.archetypeManager.migrateEntity(t, r) : this.archetypeManager.removeEntity(t), this.event.emit("remove_component", t, e);
  }
  // ------------------ 查询组件 ------------------
  getComponent(t, e) {
    return this.entityComponents.getComponent(t, e);
  }
  getComponents(t) {
    return this.entityComponents.getComponents(t);
  }
  hasComponent(t, e) {
    return this.entityComponents.hasComponent(t, e);
  }
  /** 返回拥有指定组件组合的实体列表 */
  getEntitiesWith(t) {
    const e = this.archetypeManager.queryArchetypes(t), r = [];
    for (const n of e)
      r.push(...n.entities);
    return r;
  }
  getEntityIdByComponent(t) {
    return this.entityComponents.getEntityIdByComponent(t);
  }
}
class He {
  lastTime = 0;
  running = !1;
  callbacks = [];
  constructor() {
    this.loop = this.loop.bind(this);
  }
  add(t) {
    this.callbacks.push(t);
  }
  remove(t) {
    const e = this.callbacks.indexOf(t);
    e !== -1 && this.callbacks.splice(e, 1);
  }
  start() {
    this.running || (this.running = !0, this.lastTime = performance.now(), setInterval(() => {
      this.loop(performance.now());
    }, 20));
  }
  stop() {
    this.running = !1;
  }
  loop(t) {
    if (!this.running) return;
    const e = (t - this.lastTime) / 1e3;
    this.lastTime = t;
    for (const r of this.callbacks)
      r(e);
  }
}
class Gt {
  constructor(t) {
    this.entityId = t;
  }
  parent = null;
  children = [];
  /**
   * 添加子节点
   * @param child SceneNode
   */
  addChild(t) {
    if (t.parent) {
      const e = t.parent.children.indexOf(t);
      e !== -1 && t.parent.children.splice(e, 1);
    }
    t.parent = this, this.children.push(t);
  }
  removeChild(t) {
    const e = this.children.indexOf(t);
    if (e === -1)
      throw new Error(`Cannot remove child: entity ${t.entityId} is not a child of entity ${this.entityId}`);
    this.children.splice(e, 1), t.parent = null;
  }
  /**
   * 获取所有后代节点，深度优先顺序
   */
  getDescendants() {
    const t = [];
    for (const e of this.children)
      t.push(e), t.push(...e.getDescendants());
    return t;
  }
}
class Le {
  constructor(t) {
    this.rootEntityId = t, this.root = new Gt(t), this.nodes.set(t, this.root);
  }
  /** 节点映射: entityId -> SceneNode */
  nodes = /* @__PURE__ */ new Map();
  /** 隐形根节点 */
  root;
  /**
   * 添加节点到场景树
   * @param entityId 实体ID
   * @param parentId 可选父节点ID, 默认挂到 rootNode
   */
  add(t, e) {
    this._version++, this.nodes.has(t) || this.nodes.set(t, new Gt(t)), e === void 0 && (e = this.rootEntityId);
    const r = this.nodes.get(t), n = this.nodes.get(e);
    r.parent = n, n.children.push(r), this.displayList = this.build();
  }
  remove(t) {
    this._version++;
    const e = this.nodes.get(t);
    if (!e) throw new Error(`remove fail, Entity ${t} not found`);
    e.parent && e.parent.removeChild(e), this.displayList = this.build();
  }
  /**
   * 获取节点
   */
  get(t) {
    return this.nodes.has(t) || this.nodes.set(t, new Gt(t)), this.nodes.get(t);
  }
  has(t) {
    return this.nodes.has(t);
  }
  /**
   * 删除节点（递归删除子节点）
   */
  destory(t) {
    this._version++;
    const e = this.nodes.get(t);
    if (!e) throw new Error(`destory fail, Entity ${t} not found`);
    const r = e.getDescendants();
    for (const n of r)
      this.nodes.delete(n.entityId);
    if (e.parent) {
      const n = e.parent.children.indexOf(e);
      n !== -1 && e.parent.children.splice(n, 1);
    }
    this.nodes.delete(t), this.displayList = this.build();
  }
  /**
   * 获取指定节点的父节点
   */
  getParent(t) {
    return this.nodes.get(t)?.parent || null;
  }
  /**
   * 获取场景树中所有节点
   */
  all() {
    return Array.from(this.nodes.values());
  }
  /** 清空所有非根节点 */
  clear() {
    this._version++;
    for (const t of this.root.children.slice())
      this.destory(t.entityId);
    this.displayList = this.build();
  }
  caches = [];
  version = -1;
  _version = 0;
  forEach(t, e, r = !1) {
    if (this.version === this._version && this.caches.length > 0) {
      this.forEachCaches(t, e, r);
      return;
    }
    const n = [], a = /* @__PURE__ */ new Map();
    a.set(this.root.entityId, e ?? {});
    const i = (c) => {
      const o = c.parent?.entityId ?? null, h = o != null ? a.get(o) : null;
      a.has(c.entityId) || a.set(c.entityId, {});
      const y = a.get(c.entityId);
      if (n.push({ entityId: c.entityId, parentEntityId: o }), r) {
        for (let u = c.children.length - 1; u >= 0; u--)
          i(c.children[u]);
        t(c.entityId, o, y, h);
      } else {
        t(c.entityId, o, y, h);
        for (let u = 0; u < c.children.length; u++)
          i(c.children[u]);
      }
    };
    i(this.root), this.caches = n, this.version = this._version;
  }
  forEachCaches(t, e, r = !1) {
    const n = /* @__PURE__ */ new Map();
    n.set(this.root.entityId, e ?? {});
    const a = (i, c) => {
      const o = n.get(i) ?? {};
      n.set(i, o);
      const h = c != null ? n.get(c) : null;
      t(i, c, o, h || null);
    };
    if (r)
      for (let i = this.caches.length - 1; i >= 0; i--) {
        const { entityId: c, parentEntityId: o } = this.caches[i];
        a(c, o);
      }
    else
      for (let i = 0; i < this.caches.length; i++) {
        const { entityId: c, parentEntityId: o } = this.caches[i];
        a(c, o);
      }
  }
  build() {
    const t = [];
    function e(r, n) {
      if (t.push([r.entityId, n?.entityId ?? null]), r.children)
        for (const a of r.children)
          e(a, r);
    }
    return e(this.root, null), t;
  }
  displayList = [];
}
var oe = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, ae = {};
/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var ce;
function Ne() {
  if (ce) return ae;
  ce = 1;
  var s;
  return (function(t) {
    (function(e) {
      var r = typeof globalThis == "object" ? globalThis : typeof oe == "object" ? oe : typeof self == "object" ? self : typeof this == "object" ? this : o(), n = a(t);
      typeof r.Reflect < "u" && (n = a(r.Reflect, n)), e(n, r), typeof r.Reflect > "u" && (r.Reflect = t);
      function a(h, y) {
        return function(u, p) {
          Object.defineProperty(h, u, { configurable: !0, writable: !0, value: p }), y && y(u, p);
        };
      }
      function i() {
        try {
          return Function("return this;")();
        } catch {
        }
      }
      function c() {
        try {
          return (0, eval)("(function() { return this; })()");
        } catch {
        }
      }
      function o() {
        return i() || c();
      }
    })(function(e, r) {
      var n = Object.prototype.hasOwnProperty, a = typeof Symbol == "function", i = a && typeof Symbol.toPrimitive < "u" ? Symbol.toPrimitive : "@@toPrimitive", c = a && typeof Symbol.iterator < "u" ? Symbol.iterator : "@@iterator", o = typeof Object.create == "function", h = { __proto__: [] } instanceof Array, y = !o && !h, u = {
        // create an object in dictionary mode (a.k.a. "slow" mode in v8)
        create: o ? function() {
          return Ft(/* @__PURE__ */ Object.create(null));
        } : h ? function() {
          return Ft({ __proto__: null });
        } : function() {
          return Ft({});
        },
        has: y ? function(l, f) {
          return n.call(l, f);
        } : function(l, f) {
          return f in l;
        },
        get: y ? function(l, f) {
          return n.call(l, f) ? l[f] : void 0;
        } : function(l, f) {
          return l[f];
        }
      }, p = Object.getPrototypeOf(Function), v = typeof Map == "function" && typeof Map.prototype.entries == "function" ? Map : Oe(), d = typeof Set == "function" && typeof Set.prototype.entries == "function" ? Set : Ye(), w = typeof WeakMap == "function" ? WeakMap : Xe(), g = a ? Symbol.for("@reflect-metadata:registry") : void 0, A = Be(), B = Se(A);
      function S(l, f, m, M) {
        if (b(m)) {
          if (!Qt(l))
            throw new TypeError();
          if (!Kt(f))
            throw new TypeError();
          return L(l, f);
        } else {
          if (!Qt(l))
            throw new TypeError();
          if (!j(f))
            throw new TypeError();
          if (!j(M) && !b(M) && !mt(M))
            throw new TypeError();
          return mt(M) && (M = void 0), m = J(m), rt(l, f, m, M);
        }
      }
      e("decorate", S);
      function W(l, f) {
        function m(M, P) {
          if (!j(M))
            throw new TypeError();
          if (!b(P) && !Te(P))
            throw new TypeError();
          Nt(l, f, M, P);
        }
        return m;
      }
      e("metadata", W);
      function G(l, f, m, M) {
        if (!j(m))
          throw new TypeError();
        return b(M) || (M = J(M)), Nt(l, f, m, M);
      }
      e("defineMetadata", G);
      function z(l, f, m) {
        if (!j(f))
          throw new TypeError();
        return b(m) || (m = J(m)), st(l, f, m);
      }
      e("hasMetadata", z);
      function D(l, f, m) {
        if (!j(f))
          throw new TypeError();
        return b(m) || (m = J(m)), at(l, f, m);
      }
      e("hasOwnMetadata", D);
      function $(l, f, m) {
        if (!j(f))
          throw new TypeError();
        return b(m) || (m = J(m)), wt(l, f, m);
      }
      e("getMetadata", $);
      function q(l, f, m) {
        if (!j(f))
          throw new TypeError();
        return b(m) || (m = J(m)), Lt(l, f, m);
      }
      e("getOwnMetadata", q);
      function H(l, f) {
        if (!j(l))
          throw new TypeError();
        return b(f) || (f = J(f)), Ut(l, f);
      }
      e("getMetadataKeys", H);
      function ot(l, f) {
        if (!j(l))
          throw new TypeError();
        return b(f) || (f = J(f)), Vt(l, f);
      }
      e("getOwnMetadataKeys", ot);
      function V(l, f, m) {
        if (!j(f))
          throw new TypeError();
        if (b(m) || (m = J(m)), !j(f))
          throw new TypeError();
        b(m) || (m = J(m));
        var M = Mt(
          f,
          m,
          /*Create*/
          !1
        );
        return b(M) ? !1 : M.OrdinaryDeleteMetadata(l, f, m);
      }
      e("deleteMetadata", V);
      function L(l, f) {
        for (var m = l.length - 1; m >= 0; --m) {
          var M = l[m], P = M(f);
          if (!b(P) && !mt(P)) {
            if (!Kt(P))
              throw new TypeError();
            f = P;
          }
        }
        return f;
      }
      function rt(l, f, m, M) {
        for (var P = l.length - 1; P >= 0; --P) {
          var X = l[P], F = X(f, m, M);
          if (!b(F) && !mt(F)) {
            if (!j(F))
              throw new TypeError();
            M = F;
          }
        }
        return M;
      }
      function st(l, f, m) {
        var M = at(l, f, m);
        if (M)
          return !0;
        var P = jt(f);
        return mt(P) ? !1 : st(l, P, m);
      }
      function at(l, f, m) {
        var M = Mt(
          f,
          m,
          /*Create*/
          !1
        );
        return b(M) ? !1 : Jt(M.OrdinaryHasOwnMetadata(l, f, m));
      }
      function wt(l, f, m) {
        var M = at(l, f, m);
        if (M)
          return Lt(l, f, m);
        var P = jt(f);
        if (!mt(P))
          return wt(l, P, m);
      }
      function Lt(l, f, m) {
        var M = Mt(
          f,
          m,
          /*Create*/
          !1
        );
        if (!b(M))
          return M.OrdinaryGetOwnMetadata(l, f, m);
      }
      function Nt(l, f, m, M) {
        var P = Mt(
          m,
          M,
          /*Create*/
          !0
        );
        P.OrdinaryDefineOwnMetadata(l, f, m, M);
      }
      function Ut(l, f) {
        var m = Vt(l, f), M = jt(l);
        if (M === null)
          return m;
        var P = Ut(M, f);
        if (P.length <= 0)
          return m;
        if (m.length <= 0)
          return P;
        for (var X = new d(), F = [], T = 0, x = m; T < x.length; T++) {
          var C = x[T], _ = X.has(C);
          _ || (X.add(C), F.push(C));
        }
        for (var k = 0, E = P; k < E.length; k++) {
          var C = E[k], _ = X.has(C);
          _ || (X.add(C), F.push(C));
        }
        return F;
      }
      function Vt(l, f) {
        var m = Mt(
          l,
          f,
          /*create*/
          !1
        );
        return m ? m.OrdinaryOwnMetadataKeys(l, f) : [];
      }
      function Zt(l) {
        if (l === null)
          return 1;
        switch (typeof l) {
          case "undefined":
            return 0;
          case "boolean":
            return 2;
          case "string":
            return 3;
          case "symbol":
            return 4;
          case "number":
            return 5;
          case "object":
            return l === null ? 1 : 6;
          default:
            return 6;
        }
      }
      function b(l) {
        return l === void 0;
      }
      function mt(l) {
        return l === null;
      }
      function ke(l) {
        return typeof l == "symbol";
      }
      function j(l) {
        return typeof l == "object" ? l !== null : typeof l == "function";
      }
      function Ae(l, f) {
        switch (Zt(l)) {
          case 0:
            return l;
          case 1:
            return l;
          case 2:
            return l;
          case 3:
            return l;
          case 4:
            return l;
          case 5:
            return l;
        }
        var m = "string", M = te(l, i);
        if (M !== void 0) {
          var P = M.call(l, m);
          if (j(P))
            throw new TypeError();
          return P;
        }
        return Pe(l);
      }
      function Pe(l, f) {
        var m, M, P;
        {
          var X = l.toString;
          if (kt(X)) {
            var M = X.call(l);
            if (!j(M))
              return M;
          }
          var m = l.valueOf;
          if (kt(m)) {
            var M = m.call(l);
            if (!j(M))
              return M;
          }
        }
        throw new TypeError();
      }
      function Jt(l) {
        return !!l;
      }
      function be(l) {
        return "" + l;
      }
      function J(l) {
        var f = Ae(l);
        return ke(f) ? f : be(f);
      }
      function Qt(l) {
        return Array.isArray ? Array.isArray(l) : l instanceof Object ? l instanceof Array : Object.prototype.toString.call(l) === "[object Array]";
      }
      function kt(l) {
        return typeof l == "function";
      }
      function Kt(l) {
        return typeof l == "function";
      }
      function Te(l) {
        switch (Zt(l)) {
          case 3:
            return !0;
          case 4:
            return !0;
          default:
            return !1;
        }
      }
      function $t(l, f) {
        return l === f || l !== l && f !== f;
      }
      function te(l, f) {
        var m = l[f];
        if (m != null) {
          if (!kt(m))
            throw new TypeError();
          return m;
        }
      }
      function ee(l) {
        var f = te(l, c);
        if (!kt(f))
          throw new TypeError();
        var m = f.call(l);
        if (!j(m))
          throw new TypeError();
        return m;
      }
      function ne(l) {
        return l.value;
      }
      function re(l) {
        var f = l.next();
        return f.done ? !1 : f;
      }
      function se(l) {
        var f = l.return;
        f && f.call(l);
      }
      function jt(l) {
        var f = Object.getPrototypeOf(l);
        if (typeof l != "function" || l === p || f !== p)
          return f;
        var m = l.prototype, M = m && Object.getPrototypeOf(m);
        if (M == null || M === Object.prototype)
          return f;
        var P = M.constructor;
        return typeof P != "function" || P === l ? f : P;
      }
      function Ee() {
        var l;
        !b(g) && typeof r.Reflect < "u" && !(g in r.Reflect) && typeof r.Reflect.defineMetadata == "function" && (l = Ie(r.Reflect));
        var f, m, M, P = new w(), X = {
          registerProvider: F,
          getProvider: x,
          setProvider: _
        };
        return X;
        function F(k) {
          if (!Object.isExtensible(X))
            throw new Error("Cannot add provider to a frozen registry.");
          switch (!0) {
            case l === k:
              break;
            case b(f):
              f = k;
              break;
            case f === k:
              break;
            case b(m):
              m = k;
              break;
            case m === k:
              break;
            default:
              M === void 0 && (M = new d()), M.add(k);
              break;
          }
        }
        function T(k, E) {
          if (!b(f)) {
            if (f.isProviderFor(k, E))
              return f;
            if (!b(m)) {
              if (m.isProviderFor(k, E))
                return f;
              if (!b(M))
                for (var O = ee(M); ; ) {
                  var R = re(O);
                  if (!R)
                    return;
                  var Z = ne(R);
                  if (Z.isProviderFor(k, E))
                    return se(O), Z;
                }
            }
          }
          if (!b(l) && l.isProviderFor(k, E))
            return l;
        }
        function x(k, E) {
          var O = P.get(k), R;
          return b(O) || (R = O.get(E)), b(R) && (R = T(k, E), b(R) || (b(O) && (O = new v(), P.set(k, O)), O.set(E, R))), R;
        }
        function C(k) {
          if (b(k))
            throw new TypeError();
          return f === k || m === k || !b(M) && M.has(k);
        }
        function _(k, E, O) {
          if (!C(O))
            throw new Error("Metadata provider not registered.");
          var R = x(k, E);
          if (R !== O) {
            if (!b(R))
              return !1;
            var Z = P.get(k);
            b(Z) && (Z = new v(), P.set(k, Z)), Z.set(E, O);
          }
          return !0;
        }
      }
      function Be() {
        var l;
        return !b(g) && j(r.Reflect) && Object.isExtensible(r.Reflect) && (l = r.Reflect[g]), b(l) && (l = Ee()), !b(g) && j(r.Reflect) && Object.isExtensible(r.Reflect) && Object.defineProperty(r.Reflect, g, {
          enumerable: !1,
          configurable: !1,
          writable: !1,
          value: l
        }), l;
      }
      function Se(l) {
        var f = new w(), m = {
          isProviderFor: function(C, _) {
            var k = f.get(C);
            return b(k) ? !1 : k.has(_);
          },
          OrdinaryDefineOwnMetadata: F,
          OrdinaryHasOwnMetadata: P,
          OrdinaryGetOwnMetadata: X,
          OrdinaryOwnMetadataKeys: T,
          OrdinaryDeleteMetadata: x
        };
        return A.registerProvider(m), m;
        function M(C, _, k) {
          var E = f.get(C), O = !1;
          if (b(E)) {
            if (!k)
              return;
            E = new v(), f.set(C, E), O = !0;
          }
          var R = E.get(_);
          if (b(R)) {
            if (!k)
              return;
            if (R = new v(), E.set(_, R), !l.setProvider(C, _, m))
              throw E.delete(_), O && f.delete(C), new Error("Wrong provider for target.");
          }
          return R;
        }
        function P(C, _, k) {
          var E = M(
            _,
            k,
            /*Create*/
            !1
          );
          return b(E) ? !1 : Jt(E.has(C));
        }
        function X(C, _, k) {
          var E = M(
            _,
            k,
            /*Create*/
            !1
          );
          if (!b(E))
            return E.get(C);
        }
        function F(C, _, k, E) {
          var O = M(
            k,
            E,
            /*Create*/
            !0
          );
          O.set(C, _);
        }
        function T(C, _) {
          var k = [], E = M(
            C,
            _,
            /*Create*/
            !1
          );
          if (b(E))
            return k;
          for (var O = E.keys(), R = ee(O), Z = 0; ; ) {
            var ie = re(R);
            if (!ie)
              return k.length = Z, k;
            var Re = ne(ie);
            try {
              k[Z] = Re;
            } catch (We) {
              try {
                se(R);
              } finally {
                throw We;
              }
            }
            Z++;
          }
        }
        function x(C, _, k) {
          var E = M(
            _,
            k,
            /*Create*/
            !1
          );
          if (b(E) || !E.delete(C))
            return !1;
          if (E.size === 0) {
            var O = f.get(_);
            b(O) || (O.delete(k), O.size === 0 && f.delete(O));
          }
          return !0;
        }
      }
      function Ie(l) {
        var f = l.defineMetadata, m = l.hasOwnMetadata, M = l.getOwnMetadata, P = l.getOwnMetadataKeys, X = l.deleteMetadata, F = new w(), T = {
          isProviderFor: function(x, C) {
            var _ = F.get(x);
            return !b(_) && _.has(C) ? !0 : P(x, C).length ? (b(_) && (_ = new d(), F.set(x, _)), _.add(C), !0) : !1;
          },
          OrdinaryDefineOwnMetadata: f,
          OrdinaryHasOwnMetadata: m,
          OrdinaryGetOwnMetadata: M,
          OrdinaryOwnMetadataKeys: P,
          OrdinaryDeleteMetadata: X
        };
        return T;
      }
      function Mt(l, f, m) {
        var M = A.getProvider(l, f);
        if (!b(M))
          return M;
        if (m) {
          if (A.setProvider(l, f, B))
            return B;
          throw new Error("Illegal state.");
        }
      }
      function Oe() {
        var l = {}, f = [], m = (
          /** @class */
          (function() {
            function T(x, C, _) {
              this._index = 0, this._keys = x, this._values = C, this._selector = _;
            }
            return T.prototype["@@iterator"] = function() {
              return this;
            }, T.prototype[c] = function() {
              return this;
            }, T.prototype.next = function() {
              var x = this._index;
              if (x >= 0 && x < this._keys.length) {
                var C = this._selector(this._keys[x], this._values[x]);
                return x + 1 >= this._keys.length ? (this._index = -1, this._keys = f, this._values = f) : this._index++, { value: C, done: !1 };
              }
              return { value: void 0, done: !0 };
            }, T.prototype.throw = function(x) {
              throw this._index >= 0 && (this._index = -1, this._keys = f, this._values = f), x;
            }, T.prototype.return = function(x) {
              return this._index >= 0 && (this._index = -1, this._keys = f, this._values = f), { value: x, done: !0 };
            }, T;
          })()
        ), M = (
          /** @class */
          (function() {
            function T() {
              this._keys = [], this._values = [], this._cacheKey = l, this._cacheIndex = -2;
            }
            return Object.defineProperty(T.prototype, "size", {
              get: function() {
                return this._keys.length;
              },
              enumerable: !0,
              configurable: !0
            }), T.prototype.has = function(x) {
              return this._find(
                x,
                /*insert*/
                !1
              ) >= 0;
            }, T.prototype.get = function(x) {
              var C = this._find(
                x,
                /*insert*/
                !1
              );
              return C >= 0 ? this._values[C] : void 0;
            }, T.prototype.set = function(x, C) {
              var _ = this._find(
                x,
                /*insert*/
                !0
              );
              return this._values[_] = C, this;
            }, T.prototype.delete = function(x) {
              var C = this._find(
                x,
                /*insert*/
                !1
              );
              if (C >= 0) {
                for (var _ = this._keys.length, k = C + 1; k < _; k++)
                  this._keys[k - 1] = this._keys[k], this._values[k - 1] = this._values[k];
                return this._keys.length--, this._values.length--, $t(x, this._cacheKey) && (this._cacheKey = l, this._cacheIndex = -2), !0;
              }
              return !1;
            }, T.prototype.clear = function() {
              this._keys.length = 0, this._values.length = 0, this._cacheKey = l, this._cacheIndex = -2;
            }, T.prototype.keys = function() {
              return new m(this._keys, this._values, P);
            }, T.prototype.values = function() {
              return new m(this._keys, this._values, X);
            }, T.prototype.entries = function() {
              return new m(this._keys, this._values, F);
            }, T.prototype["@@iterator"] = function() {
              return this.entries();
            }, T.prototype[c] = function() {
              return this.entries();
            }, T.prototype._find = function(x, C) {
              if (!$t(this._cacheKey, x)) {
                this._cacheIndex = -1;
                for (var _ = 0; _ < this._keys.length; _++)
                  if ($t(this._keys[_], x)) {
                    this._cacheIndex = _;
                    break;
                  }
              }
              return this._cacheIndex < 0 && C && (this._cacheIndex = this._keys.length, this._keys.push(x), this._values.push(void 0)), this._cacheIndex;
            }, T;
          })()
        );
        return M;
        function P(T, x) {
          return T;
        }
        function X(T, x) {
          return x;
        }
        function F(T, x) {
          return [T, x];
        }
      }
      function Ye() {
        var l = (
          /** @class */
          (function() {
            function f() {
              this._map = new v();
            }
            return Object.defineProperty(f.prototype, "size", {
              get: function() {
                return this._map.size;
              },
              enumerable: !0,
              configurable: !0
            }), f.prototype.has = function(m) {
              return this._map.has(m);
            }, f.prototype.add = function(m) {
              return this._map.set(m, m), this;
            }, f.prototype.delete = function(m) {
              return this._map.delete(m);
            }, f.prototype.clear = function() {
              this._map.clear();
            }, f.prototype.keys = function() {
              return this._map.keys();
            }, f.prototype.values = function() {
              return this._map.keys();
            }, f.prototype.entries = function() {
              return this._map.entries();
            }, f.prototype["@@iterator"] = function() {
              return this.keys();
            }, f.prototype[c] = function() {
              return this.keys();
            }, f;
          })()
        );
        return l;
      }
      function Xe() {
        var l = 16, f = u.create(), m = M();
        return (
          /** @class */
          (function() {
            function x() {
              this._key = M();
            }
            return x.prototype.has = function(C) {
              var _ = P(
                C,
                /*create*/
                !1
              );
              return _ !== void 0 ? u.has(_, this._key) : !1;
            }, x.prototype.get = function(C) {
              var _ = P(
                C,
                /*create*/
                !1
              );
              return _ !== void 0 ? u.get(_, this._key) : void 0;
            }, x.prototype.set = function(C, _) {
              var k = P(
                C,
                /*create*/
                !0
              );
              return k[this._key] = _, this;
            }, x.prototype.delete = function(C) {
              var _ = P(
                C,
                /*create*/
                !1
              );
              return _ !== void 0 ? delete _[this._key] : !1;
            }, x.prototype.clear = function() {
              this._key = M();
            }, x;
          })()
        );
        function M() {
          var x;
          do
            x = "@@WeakMap@@" + T();
          while (u.has(f, x));
          return f[x] = !0, x;
        }
        function P(x, C) {
          if (!n.call(x, m)) {
            if (!C)
              return;
            Object.defineProperty(x, m, { value: u.create() });
          }
          return x[m];
        }
        function X(x, C) {
          for (var _ = 0; _ < C; ++_)
            x[_] = Math.random() * 255 | 0;
          return x;
        }
        function F(x) {
          if (typeof Uint8Array == "function") {
            var C = new Uint8Array(x);
            return typeof crypto < "u" ? crypto.getRandomValues(C) : typeof msCrypto < "u" ? msCrypto.getRandomValues(C) : X(C, x), C;
          }
          return X(new Array(x), x);
        }
        function T() {
          var x = F(l);
          x[6] = x[6] & 79 | 64, x[8] = x[8] & 191 | 128;
          for (var C = "", _ = 0; _ < l; ++_) {
            var k = x[_];
            (_ === 4 || _ === 6 || _ === 8) && (C += "-"), k < 16 && (C += "0"), C += k.toString(16).toLowerCase();
          }
          return C;
        }
      }
      function Ft(l) {
        return l.__ = void 0, delete l.__, l;
      }
    });
  })(s || (s = {})), ae;
}
Ne();
function it(s) {
  return function(t) {
    Reflect.defineMetadata("component:name", s, t), fe.set(s, t);
  };
}
var gt = typeof Float32Array < "u" ? Float32Array : Array;
function nt() {
  var s = new gt(9);
  return gt != Float32Array && (s[1] = 0, s[2] = 0, s[3] = 0, s[5] = 0, s[6] = 0, s[7] = 0), s[0] = 1, s[4] = 1, s[8] = 1, s;
}
function Ue(s, t) {
  return s[0] = t[0], s[1] = t[1], s[2] = t[2], s[3] = t[3], s[4] = t[4], s[5] = t[5], s[6] = t[6], s[7] = t[7], s[8] = t[8], s;
}
function Ve(s, t, e, r, n, a, i, c, o) {
  var h = new gt(9);
  return h[0] = s, h[1] = t, h[2] = e, h[3] = r, h[4] = n, h[5] = a, h[6] = i, h[7] = c, h[8] = o, h;
}
function Ze(s) {
  return s[0] = 1, s[1] = 0, s[2] = 0, s[3] = 0, s[4] = 1, s[5] = 0, s[6] = 0, s[7] = 0, s[8] = 1, s;
}
function pt(s, t) {
  var e = t[0], r = t[1], n = t[2], a = t[3], i = t[4], c = t[5], o = t[6], h = t[7], y = t[8], u = y * i - c * h, p = -y * a + c * o, v = h * a - i * o, d = e * u + r * p + n * v;
  return d ? (d = 1 / d, s[0] = u * d, s[1] = (-y * r + n * h) * d, s[2] = (c * r - n * i) * d, s[3] = p * d, s[4] = (y * e - n * o) * d, s[5] = (-c * e + n * a) * d, s[6] = v * d, s[7] = (-h * e + r * o) * d, s[8] = (i * e - r * a) * d, s) : null;
}
function he(s, t, e) {
  var r = t[0], n = t[1], a = t[2], i = t[3], c = t[4], o = t[5], h = t[6], y = t[7], u = t[8], p = e[0], v = e[1], d = e[2], w = e[3], g = e[4], A = e[5], B = e[6], S = e[7], W = e[8];
  return s[0] = p * r + v * i + d * h, s[1] = p * n + v * c + d * y, s[2] = p * a + v * o + d * u, s[3] = w * r + g * i + A * h, s[4] = w * n + g * c + A * y, s[5] = w * a + g * o + A * u, s[6] = B * r + S * i + W * h, s[7] = B * n + S * c + W * y, s[8] = B * a + S * o + W * u, s;
}
function le(s, t, e) {
  var r = t[0], n = t[1], a = t[2], i = t[3], c = t[4], o = t[5], h = t[6], y = t[7], u = t[8], p = e[0], v = e[1];
  return s[0] = r, s[1] = n, s[2] = a, s[3] = i, s[4] = c, s[5] = o, s[6] = p * r + v * i + h, s[7] = p * n + v * c + y, s[8] = p * a + v * o + u, s;
}
function Je(s, t, e) {
  var r = t[0], n = t[1], a = t[2], i = t[3], c = t[4], o = t[5], h = t[6], y = t[7], u = t[8], p = Math.sin(e), v = Math.cos(e);
  return s[0] = v * r + p * i, s[1] = v * n + p * c, s[2] = v * a + p * o, s[3] = v * i - p * r, s[4] = v * c - p * n, s[5] = v * o - p * a, s[6] = h, s[7] = y, s[8] = u, s;
}
function Qe(s, t, e) {
  var r = e[0], n = e[1];
  return s[0] = r * t[0], s[1] = r * t[1], s[2] = r * t[2], s[3] = n * t[3], s[4] = n * t[4], s[5] = n * t[5], s[6] = t[6], s[7] = t[7], s[8] = t[8], s;
}
function _t() {
  var s = new gt(2);
  return gt != Float32Array && (s[0] = 0, s[1] = 0), s;
}
function Y(s, t) {
  var e = new gt(2);
  return e[0] = s, e[1] = t, e;
}
function U(s, t, e) {
  var r = t[0], n = t[1];
  return s[0] = e[0] * r + e[3] * n + e[6], s[1] = e[1] * r + e[4] * n + e[7], s;
}
(function() {
  var s = _t();
  return function(t, e, r, n, a, i) {
    var c, o;
    for (e || (e = 2), r || (r = 0), n ? o = Math.min(n * e + r, t.length) : o = t.length, c = r; c < o; c += e)
      s[0] = t[c], s[1] = t[c + 1], a(s, s, i), t[c] = s[0], t[c + 1] = s[1];
    return t;
  };
})();
var Ke = Object.defineProperty, tn = Object.getOwnPropertyDescriptor, ue = (s) => {
  throw TypeError(s);
}, en = (s, t, e) => t in s ? Ke(s, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : s[t] = e, nn = (s, t, e, r) => {
  for (var n = r > 1 ? void 0 : r ? tn(t, e) : t, a = s.length - 1, i; a >= 0; a--)
    (i = s[a]) && (n = i(n) || n);
  return n;
}, qt = (s, t, e) => en(s, typeof t != "symbol" ? t + "" : t, e), de = (s, t, e) => t.has(s) || ue("Cannot " + e), Q = (s, t, e) => (de(s, t, "read from private field"), e ? e.call(s) : t.get(s)), K = (s, t, e) => t.has(s) ? ue("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(s) : t.set(s, e), tt = (s, t, e, r) => (de(s, t, "write to private field"), t.set(s, e), e), At, Pt, bt, Tt, Et, Bt, St, It, Ot, Yt;
let I = class {
  constructor(s, t = {}) {
    K(this, At, 0), K(this, Pt, 0), K(this, bt, 1), K(this, Tt, 1), K(this, Et, 0), K(this, Bt, 0), K(this, St, 0), K(this, It, 0), K(this, Ot, 0), qt(this, "localMatrix", nt()), qt(this, "worldMatrix", nt()), qt(this, "dirty", !0), K(this, Yt), tt(this, Yt, s), Q(this, Yt);
    const e = ["x", "y", "scaleX", "scaleY", "rotation", "skewX", "skewY", "pivotX", "pivotY"];
    for (const r of e)
      t[r] !== void 0 && (this[r] = t[r]);
  }
  get x() {
    return Q(this, At);
  }
  set x(s) {
    tt(this, At, s), this.dirty = !0;
  }
  get y() {
    return Q(this, Pt);
  }
  set y(s) {
    tt(this, Pt, s), this.dirty = !0;
  }
  get scaleX() {
    return Q(this, bt);
  }
  set scaleX(s) {
    tt(this, bt, s), this.dirty = !0;
  }
  get scaleY() {
    return Q(this, Tt);
  }
  set scaleY(s) {
    tt(this, Tt, s), this.dirty = !0;
  }
  get rotation() {
    return Q(this, Et);
  }
  set rotation(s) {
    tt(this, Et, s), this.dirty = !0;
  }
  get skewX() {
    return Q(this, Bt);
  }
  set skewX(s) {
    tt(this, Bt, s), this.dirty = !0;
  }
  get skewY() {
    return Q(this, St);
  }
  set skewY(s) {
    tt(this, St, s), this.dirty = !0;
  }
  get pivotX() {
    return Q(this, It);
  }
  set pivotX(s) {
    tt(this, It, s), this.dirty = !0;
  }
  get pivotY() {
    return Q(this, Ot);
  }
  set pivotY(s) {
    tt(this, Ot, s), this.dirty = !0;
  }
};
At = /* @__PURE__ */ new WeakMap();
Pt = /* @__PURE__ */ new WeakMap();
bt = /* @__PURE__ */ new WeakMap();
Tt = /* @__PURE__ */ new WeakMap();
Et = /* @__PURE__ */ new WeakMap();
Bt = /* @__PURE__ */ new WeakMap();
St = /* @__PURE__ */ new WeakMap();
It = /* @__PURE__ */ new WeakMap();
Ot = /* @__PURE__ */ new WeakMap();
Yt = /* @__PURE__ */ new WeakMap();
I = nn([
  it("Transform")
], I);
class rn {
  constructor(t) {
    this.engine = t, this.entityId = this.engine.ecs.createEntity(), this.engine.ecs.addComponent(this.entityId, new I(this.engine, { x: 0, y: 0 }));
  }
  entityId;
  /**
   * 获取 Transform 组件
   */
  get transform() {
    return this.engine.ecs.getComponent(this.entityId, I);
  }
}
class Wt {
  constructor(t, e) {
    this.engine = t, this.sceneTree = e;
  }
  ecs;
  init(t) {
    this.ecs = t, this.onInit();
  }
  onInit() {
  }
}
var sn = Object.getOwnPropertyDescriptor, on = (s, t, e, r) => {
  for (var n = r > 1 ? void 0 : r ? sn(t, e) : t, a = s.length - 1, i; a >= 0; a--)
    (i = s[a]) && (n = i(n) || n);
  return n;
};
let ct = class extends dt {
  width;
  height;
  render = !0;
  fillStyle;
  strokeStyle;
  lineWidth;
  alpha;
  radius;
  constructor(s, {
    width: t = 0,
    height: e = 0,
    fillStyle: r = "#181b1dff",
    strokeStyle: n,
    lineWidth: a = 0,
    alpha: i = 1,
    render: c = !0,
    radius: o = 0
  } = {}) {
    super(s), this.width = t, this.height = e, this.fillStyle = r || "#181b1dff", this.strokeStyle = n || "#181b1dff", this.lineWidth = a || 0, this.alpha = i || 1, this.radius = o || 0, this.render = c;
  }
};
ct = on([
  it("Rect")
], ct);
class an {
  match(t, e) {
    return t.hasComponent(e, ct);
  }
  exec(t, e) {
    const r = t.ecs, n = r.canvas.getContext("2d"), a = r.getComponent(e, I), i = r.getComponent(e, ct);
    if (!i.render) return;
    n.save(), n.globalAlpha = i.alpha;
    const c = a.worldMatrix;
    n.setTransform(
      c[0],
      // a = m00
      c[1],
      // b = m10
      c[3],
      // c = m01
      c[4],
      // d = m11
      c[6],
      // e = m20 (平移x)
      c[7]
      // f = m21 (平移y)
    );
    const { width: o, height: h, radius: y = 0 } = i;
    n.beginPath(), y > 0 ? n.roundRect(0, 0, o, h, y) : n.rect(0, 0, o, h), i.fillStyle && (n.fillStyle = i.fillStyle, n.fill()), i.strokeStyle && i.lineWidth > 0 && (n.strokeStyle = i.strokeStyle, n.lineWidth = i.lineWidth, n.stroke()), n.restore();
  }
}
var cn = Object.getOwnPropertyDescriptor, hn = (s, t, e, r) => {
  for (var n = r > 1 ? void 0 : r ? cn(t, e) : t, a = s.length - 1, i; a >= 0; a--)
    (i = s[a]) && (n = i(n) || n);
  return n;
};
let et = class extends dt {
  render = !0;
  /** 主半径（x 方向） */
  radius;
  /** 次半径（y 方向，默认为 radius） */
  radiusY;
  /** 填充颜色 */
  fillStyle;
  /** 描边颜色 */
  strokeStyle;
  /** 描边宽度 */
  lineWidth;
  /** 透明度 */
  alpha;
  /** 椭圆旋转角度（弧度） */
  rotation;
  /** 圆弧起始角度（弧度，0 = 3点钟方向） */
  startAngle;
  /** 圆弧结束角度（弧度） */
  endAngle;
  /** 是否顺时针绘制圆弧（默认为 true） */
  clockwise;
  constructor(s, {
    radius: t = 10,
    radiusY: e,
    // 可选，不传时自动与 radius 相等
    fillStyle: r = "#e74c3c",
    strokeStyle: n,
    lineWidth: a = 0,
    alpha: i = 1,
    rotation: c = 0,
    render: o = !0,
    startAngle: h = 0,
    endAngle: y = Math.PI * 2,
    clockwise: u = !0
  } = {}) {
    super(s), this.radius = t, e && (this.radiusY = e), this.fillStyle = r, this.strokeStyle = n ?? "#c0392b", this.lineWidth = a, this.alpha = i, this.rotation = c, this.render = o, this.startAngle = h, this.endAngle = y, this.clockwise = u;
  }
  /** 是否是圆形（辅助判断） */
  get isCircle() {
    return this.radius === this.radiusY;
  }
  /** 是否是完整圆或完整椭圆（start = 0, end = 2π） */
  get isFullCircle() {
    return Math.abs(this.endAngle - this.startAngle) >= Math.PI * 2 && this.isCircle;
  }
};
et = hn([
  it("Circle")
], et);
class ln {
  match(t, e) {
    return t.hasComponent(e, et);
  }
  exec(t, e) {
    const r = t.ecs, n = r.canvas.getContext("2d"), a = r.getComponent(e, I), i = r.getComponent(e, et);
    if (!i.render) return;
    n.save(), n.globalAlpha = i.alpha;
    const c = a.worldMatrix;
    n.setTransform(
      c[0],
      c[1],
      c[3],
      c[4],
      c[6],
      c[7]
    );
    const { radius: o, radiusY: h = o, rotation: y = 0, startAngle: u = 0, endAngle: p = Math.PI * 2, clockwise: v = !1 } = i;
    n.beginPath(), h === o ? n.arc(0, 0, o, u, p, !!v) : n.ellipse(0, 0, o, h, y, u, p, !!v), i.fillStyle && (n.fillStyle = i.fillStyle, n.fill()), i.strokeStyle && i.lineWidth > 0 && (n.strokeStyle = i.strokeStyle, n.lineWidth = i.lineWidth, n.stroke()), n.restore();
  }
}
var fn = Object.defineProperty, un = Object.getOwnPropertyDescriptor, pe = (s) => {
  throw TypeError(s);
}, dn = (s, t, e) => t in s ? fn(s, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : s[t] = e, pn = (s, t, e, r) => {
  for (var n = r > 1 ? void 0 : r ? un(t, e) : t, a = s.length - 1, i; a >= 0; a--)
    (i = s[a]) && (n = i(n) || n);
  return n;
}, zt = (s, t, e) => dn(s, typeof t != "symbol" ? t + "" : t, e), me = (s, t, e) => t.has(s) || pe("Cannot " + e), xt = (s, t, e) => (me(s, t, "read from private field"), e ? e.call(s) : t.get(s)), Ht = (s, t, e) => t.has(s) ? pe("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(s) : t.set(s, e), Ct = (s, t, e, r) => (me(s, t, "write to private field"), t.set(s, e), e), Xt, yt, vt;
let ht = class extends dt {
  // 裁剪区域 [x, y, w, h]
  constructor(s, t = {}) {
    super(s), Ht(this, Xt, null), Ht(this, yt, 0), Ht(this, vt, 0), zt(this, "alpha", 1), zt(this, "render", !0), zt(this, "clip"), t.clip !== void 0 && (this.clip = t.clip), t.bitmap !== void 0 && (this.bitmap = t.bitmap), t.width !== void 0 && (this.width = t.width), t.height !== void 0 && (this.height = t.height), t.alpha !== void 0 && (this.alpha = t.alpha), t.render !== void 0 && (this.render = t.render);
  }
  get bitmap() {
    return xt(this, Xt);
  }
  set bitmap(s) {
    Ct(this, Xt, s), s && xt(this, yt) === 0 && Ct(this, yt, s.width), s && xt(this, vt) === 0 && Ct(this, vt, s.height);
  }
  get width() {
    return xt(this, yt);
  }
  set width(s) {
    Ct(this, yt, s);
  }
  get height() {
    return xt(this, vt);
  }
  set height(s) {
    Ct(this, vt, s);
  }
};
Xt = /* @__PURE__ */ new WeakMap();
yt = /* @__PURE__ */ new WeakMap();
vt = /* @__PURE__ */ new WeakMap();
ht = pn([
  it("Image")
], ht);
class mn {
  match(t, e) {
    return t.hasComponent(e, ht);
  }
  exec(t, e) {
    const r = t.ecs, n = r.canvas.getContext("2d"), a = r.getComponent(e, I), i = r.getComponent(e, ht);
    if (!i.render || !i.bitmap) return;
    n.save(), n.globalAlpha = i.alpha;
    const [c, o, h, y] = i.clip || [0, 0, i.bitmap.width, i.bitmap.height], u = a.worldMatrix;
    n.setTransform(
      u[0],
      // a = m00
      u[1],
      // b = m10
      u[3],
      // c = m01
      u[4],
      // d = m11
      u[6],
      // e = m20
      u[7]
      // f = m21
    ), n.drawImage(
      i.bitmap,
      c,
      o,
      h,
      y,
      0,
      0,
      // 目标起点
      i.width,
      // 目标宽
      i.height
      // 目标高
    ), n.restore();
  }
}
var yn = Object.getOwnPropertyDescriptor, vn = (s, t, e, r) => {
  for (var n = r > 1 ? void 0 : r ? yn(t, e) : t, a = s.length - 1, i; a >= 0; a--)
    (i = s[a]) && (n = i(n) || n);
  return n;
};
let N = class {
  // 当前节点自身图形包围盒
  selfAABB = { minX: 1 / 0, minY: 1 / 0, maxX: -1 / 0, maxY: -1 / 0 };
  childrenAABB = { minX: 1 / 0, minY: 1 / 0, maxX: -1 / 0, maxY: -1 / 0 };
  totalAABB = { minX: 1 / 0, minY: 1 / 0, maxX: -1 / 0, maxY: -1 / 0 };
  dirty = !0;
  constructor() {
  }
  reset() {
    this.selfAABB = { minX: 1 / 0, minY: 1 / 0, maxX: -1 / 0, maxY: -1 / 0 }, this.childrenAABB = { minX: 1 / 0, minY: 1 / 0, maxX: -1 / 0, maxY: -1 / 0 }, this.totalAABB = { minX: 1 / 0, minY: 1 / 0, maxX: -1 / 0, maxY: -1 / 0 };
  }
  // 设置自身 AABB
  setSelf(s) {
    this.selfAABB.minX = s.minX, this.selfAABB.minY = s.minY, this.selfAABB.maxX = s.maxX, this.selfAABB.maxY = s.maxY, this.dirty = !0;
  }
  // 设置子节点 AABB
  setChildren(s) {
    this.childrenAABB.minX = s.minX, this.childrenAABB.minY = s.minY, this.childrenAABB.maxX = s.maxX, this.childrenAABB.maxY = s.maxY, this.dirty = !0;
  }
  // 计算总包围盒（self + children）
  updateTotalAABB() {
    this.totalAABB = { minX: 1 / 0, minY: 1 / 0, maxX: -1 / 0, maxY: -1 / 0 }, this.merge(this.totalAABB, this.selfAABB), this.merge(this.totalAABB, this.childrenAABB), this.dirty = !1;
  }
  // 命中检测（可以选择 self / children / total）
  hitTest(s, t, e = "total") {
    let r;
    switch (e) {
      case "self":
        r = this.selfAABB;
        break;
      case "children":
        r = this.childrenAABB;
        break;
      case "total":
        r = this.totalAABB;
        break;
    }
    return s >= r.minX && t >= r.minY && s <= r.maxX && t <= r.maxY;
  }
  merge(s, t) {
    s.minX = Math.min(s.minX, t.minX), s.minY = Math.min(s.minY, t.minY), s.maxX = Math.max(s.maxX, t.maxX), s.maxY = Math.max(s.maxY, t.maxY);
  }
};
N = vn([
  it("BoundingBoxComponent")
], N);
const gn = nt();
class ye {
  match(t, e) {
    return !0;
  }
  /**
   * 执行渲染逻辑
   */
  exec(t, e, r, n, a) {
    const c = t.ecs.getComponent(e, I);
    if (n.dirty = c.dirty, !(n.dirty || (a ? a.dirty : !1))) return;
    n.dirty = !0, c.dirty = !1;
    const h = t.ecs.getComponent(e, N);
    h && (h.dirty = !0), this.updateEntityMatrix(t, e);
  }
  updateEntityMatrix(t, e) {
    const r = t.ecs, n = r.getComponent(e, I);
    Ze(n.localMatrix);
    const a = n.pivotX, i = n.pivotY;
    if (le(n.localMatrix, n.localMatrix, [n.x + a, n.y + i]), Je(n.localMatrix, n.localMatrix, n.rotation), n.skewX !== 0 || n.skewY !== 0) {
      const o = Ve(
        1,
        Math.tan(n.skewX),
        0,
        Math.tan(n.skewY),
        1,
        0,
        0,
        0,
        1
      );
      he(n.localMatrix, n.localMatrix, o);
    }
    Qe(n.localMatrix, n.localMatrix, [n.scaleX, n.scaleY]), le(n.localMatrix, n.localMatrix, [-a, -i]);
    const c = t.sceneTree.getParent(e);
    if (c != null) {
      const h = r.getComponent(c.entityId, I)?.worldMatrix || gn;
      he(n.worldMatrix, h, n.localMatrix);
    } else
      Ue(n.worldMatrix, n.localMatrix);
  }
}
class ve {
  match(t, e) {
    return t.hasComponent(e, et);
  }
  /** 计算世界空间下 AABB */
  computeAABB(t, e) {
    const r = t.getComponent(e, et), n = t.getComponent(e, I), { radius: a, radiusY: i = a, rotation: c = 0, startAngle: o, endAngle: h, clockwise: y } = r, u = n.worldMatrix, p = u[6], v = u[7], d = u[0], w = u[1], g = u[3], A = u[4], B = a * Math.hypot(d, w), S = i * Math.hypot(g, A);
    if (o === 0 && h === 2 * Math.PI) {
      const G = Math.cos(c), z = Math.sin(c), D = Math.abs(B * G) + Math.abs(S * z), $ = Math.abs(B * z) + Math.abs(S * G);
      return {
        minX: p - D,
        minY: v - $,
        maxX: p + D,
        maxY: v + $
      };
    } else {
      const G = [o, h], z = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
      for (const L of z)
        this.isAngleBetween(L, o, h, y) && G.push(L);
      let D = 1 / 0, $ = 1 / 0, q = -1 / 0, H = -1 / 0;
      const ot = Math.cos(c), V = Math.sin(c);
      for (const L of G) {
        const rt = B * Math.cos(L), st = S * Math.sin(L), at = rt * ot - st * V, wt = rt * V + st * ot;
        D = Math.min(D, at), $ = Math.min($, wt), q = Math.max(q, at), H = Math.max(H, wt);
      }
      return D = Math.min(D, 0), $ = Math.min($, 0), q = Math.max(q, 0), H = Math.max(H, 0), {
        minX: p + D,
        minY: v + $,
        maxX: p + q,
        maxY: v + H
      };
    }
  }
  /** 命中检测 */
  hit(t, e, r, n) {
    const a = t.getComponent(e, et);
    return a.startAngle === 0 && a.endAngle === 2 * Math.PI ? this.hitFullCircle(t, e, r, n) : this.hitArc(t, e, r, n);
  }
  /** 完整圆 / 椭圆命中检测 */
  hitFullCircle(t, e, r, n) {
    const a = t.getComponent(e, et), i = t.getComponent(e, I), { radius: c, radiusY: o = c, rotation: h = 0 } = a, y = i.worldMatrix, u = nt();
    pt(u, y);
    const p = Y(r, n);
    U(p, p, u);
    let v = p[0], d = p[1];
    if (h !== 0) {
      const g = Math.cos(-h), A = Math.sin(-h), B = v * g - d * A, S = v * A + d * g;
      v = B, d = S;
    }
    return v * v / (c * c) + d * d / (o * o) <= 1;
  }
  /** 圆弧 / 扇形命中检测 */
  hitArc(t, e, r, n) {
    const a = t.getComponent(e, et), i = t.getComponent(e, I), { radius: c, radiusY: o = c, rotation: h = 0, startAngle: y, endAngle: u, clockwise: p } = a, v = i.worldMatrix, d = nt();
    pt(d, v);
    const w = Y(r, n);
    U(w, w, d);
    let g = w[0], A = w[1];
    if (h !== 0) {
      const V = Math.cos(-h), L = Math.sin(-h), rt = g * V - A * L, st = g * L + A * V;
      g = rt, A = st;
    }
    const B = g / c, S = A / o, W = Math.hypot(B, S);
    let G = Math.atan2(S, B);
    G < 0 && (G += 2 * Math.PI);
    const z = this.isAngleBetween(G, y, u, p);
    if (W <= 1 && z) return !0;
    const D = c * Math.cos(y), $ = o * Math.sin(y), q = c * Math.cos(u), H = o * Math.sin(u), ot = p ? [{ x: 0, y: 0 }, { x: D, y: $ }, { x: q, y: H }] : [{ x: 0, y: 0 }, { x: q, y: H }, { x: D, y: $ }];
    return !!this.pointInPolygon({ x: g, y: A }, ot);
  }
  /** 判断角度是否在弧段内（顺时针或逆时针） */
  isAngleBetween(t, e, r, n) {
    return t = (t + 2 * Math.PI) % (2 * Math.PI), e = (e + 2 * Math.PI) % (2 * Math.PI), r = (r + 2 * Math.PI) % (2 * Math.PI), n ? (e - t + 2 * Math.PI) % (2 * Math.PI) <= (e - r + 2 * Math.PI) % (2 * Math.PI) : (t - e + 2 * Math.PI) % (2 * Math.PI) <= (r - e + 2 * Math.PI) % (2 * Math.PI);
  }
  /** 点是否在多边形内（射线法） */
  pointInPolygon(t, e) {
    let r = !1;
    const n = e.length;
    for (let a = 0, i = n - 1; a < n; i = a++) {
      const c = e[a].x, o = e[a].y, h = e[i].x, y = e[i].y;
      o > t.y != y > t.y && t.x < (h - c) * (t.y - o) / (y - o + 1e-10) + c && (r = !r);
    }
    return r;
  }
}
class ge {
  match(t, e) {
    return t.hasComponent(e, ct);
  }
  computeAABB(t, e) {
    const r = t.getComponent(e, ct), n = t.getComponent(e, I), { width: a, height: i } = r, { pivotX: c, pivotY: o } = n, h = n.worldMatrix, u = [
      Y(-c, -o),
      Y(a - c, -o),
      Y(a - c, i - o),
      Y(-c, i - o)
    ].map((g) => U(_t(), g, h));
    let p = 1 / 0, v = 1 / 0, d = -1 / 0, w = -1 / 0;
    for (const g of u)
      p = Math.min(p, g[0]), v = Math.min(v, g[1]), d = Math.max(d, g[0]), w = Math.max(w, g[1]);
    return { minX: p, minY: v, maxX: d, maxY: w };
  }
  hit(t, e, r, n) {
    const a = t.getComponent(e, ct), i = t.getComponent(e, I), { width: c, height: o, radius: h = 0 } = a, { pivotX: y, pivotY: u } = i, p = i.worldMatrix, v = nt();
    pt(v, p);
    const d = Y(r, n);
    U(d, d, v);
    const w = d[0], g = d[1];
    if (w < -y || w > c - y || g < -u || g > o - u)
      return !1;
    if (h <= 0) return !0;
    const A = [
      [-y + h, -u + h],
      // 左上
      [c - y - h, -u + h],
      // 右上
      [c - y - h, o - u - h],
      // 右下
      [-y + h, o - u - h]
      // 左下
    ], B = [
      w < -y + h && g < -u + h,
      // 左上
      w > c - y - h && g < -u + h,
      // 右上
      w > c - y - h && g > o - u - h,
      // 右下
      w < -y + h && g > o - u - h
      // 左下
    ];
    for (let S = 0; S < 4; S++)
      if (B[S]) {
        const W = w - A[S][0], G = g - A[S][1];
        if (W * W + G * G > h * h) return !1;
      }
    return !0;
  }
}
class we {
  match(t, e) {
    return t.hasComponent(e, ht);
  }
  /**
   * 计算图片的世界包围盒（考虑变换矩阵）
   */
  computeAABB(t, e) {
    const r = t.getComponent(e, ht), n = t.getComponent(e, I), { width: a, height: i } = r, c = n.worldMatrix, h = [
      Y(0, 0),
      Y(a, 0),
      Y(0, i),
      Y(a, i)
    ].map((d) => {
      const w = _t();
      return U(w, d, c), w;
    });
    let y = 1 / 0, u = 1 / 0, p = -1 / 0, v = -1 / 0;
    for (const d of h)
      d[0] < y && (y = d[0]), d[1] < u && (u = d[1]), d[0] > p && (p = d[0]), d[1] > v && (v = d[1]);
    return { minX: y, minY: u, maxX: p, maxY: v };
  }
  /**
   * 命中检测：判断点击点 (x, y) 是否落在图片内部（考虑旋转、缩放、平移）
   */
  hit(t, e, r, n) {
    const a = t.getComponent(e, ht), i = t.getComponent(e, I), { width: c, height: o } = a, h = i.worldMatrix, y = nt();
    pt(y, h);
    const u = Y(r, n);
    U(u, u, y);
    const p = u[0], v = u[1];
    return p >= 0 && p <= c && v >= 0 && v <= o;
  }
}
var wn = Object.getOwnPropertyDescriptor, Mn = (s, t, e, r) => {
  for (var n = r > 1 ? void 0 : r ? wn(t, e) : t, a = s.length - 1, i; a >= 0; a--)
    (i = s[a]) && (n = i(n) || n);
  return n;
};
let lt = class extends dt {
  /** 顶点列表，例如 [{x:0, y:0}, {x:100, y:50}] */
  points = [];
  /** 是否闭合成多边形 */
  closed = !1;
  /** 填充样式（闭合时有效） */
  fillStyle;
  /** 线条样式 */
  strokeStyle;
  /** 线宽 */
  lineWidth;
  /** 透明度 */
  alpha;
  /** 是否参与渲染 */
  render = !0;
  constructor(s, {
    points: t = [],
    closed: e = !1,
    fillStyle: r,
    strokeStyle: n = "#000000",
    lineWidth: a = 1,
    alpha: i = 1,
    render: c = !0
  } = {}) {
    super(s), this.points = t, this.closed = e, this.fillStyle = r, this.strokeStyle = n, this.lineWidth = a, this.alpha = i, this.render = c;
  }
};
lt = Mn([
  it("Polyline")
], lt);
class Me {
  match(t, e) {
    return t.hasComponent(e, lt);
  }
  computeAABB(t, e) {
    const r = t.getComponent(e, lt), a = t.getComponent(e, I).worldMatrix;
    if (!r.points || r.points.length === 0)
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const i = r.points.map(
      (u) => U(_t(), Y(u[0], u[1]), a)
    );
    let c = 1 / 0, o = 1 / 0, h = -1 / 0, y = -1 / 0;
    for (const u of i)
      c = Math.min(c, u[0]), o = Math.min(o, u[1]), h = Math.max(h, u[0]), y = Math.max(y, u[1]);
    return { minX: c, minY: o, maxX: h, maxY: y };
  }
  hit(t, e, r, n) {
    const a = t.getComponent(e, lt), i = t.getComponent(e, I);
    if (!a.points || a.points.length < 2) return !1;
    const c = nt();
    pt(c, i.worldMatrix);
    const o = Y(r, n);
    U(o, o, c);
    const h = a.points, y = o[0], u = o[1];
    if (a.closed) {
      let p = !1;
      for (let v = 0, d = h.length - 1; v < h.length; d = v++) {
        const w = h[v][0], g = h[v][1], A = h[d][0], B = h[d][1];
        g > u != B > u && y < (A - w) * (u - g) / (B - g) + w && (p = !p);
      }
      return p;
    } else {
      for (let v = 0; v < h.length - 1; v++) {
        const d = h[v], w = h[v + 1];
        if (this.pointToSegmentDistance(y, u, d[0], d[1], w[0], w[1]) <= 3)
          return !0;
      }
      return !1;
    }
  }
  /** 计算点到线段的最短距离 */
  pointToSegmentDistance(t, e, r, n, a, i) {
    const c = a - r, o = i - n;
    if (c === 0 && o === 0)
      return Math.hypot(t - r, e - n);
    const h = ((t - r) * c + (e - n) * o) / (c * c + o * o), y = Math.max(0, Math.min(1, h)), u = r + y * c, p = n + y * o;
    return Math.hypot(t - u, e - p);
  }
}
var xn = Object.getOwnPropertyDescriptor, Cn = (s, t, e, r) => {
  for (var n = r > 1 ? void 0 : r ? xn(t, e) : t, a = s.length - 1, i; a >= 0; a--)
    (i = s[a]) && (n = i(n) || n);
  return n;
};
let ft = class extends dt {
  start = [0, 0];
  cp1 = [0, 0];
  cp2;
  end = [0, 0];
  strokeStyle = "#000";
  lineWidth = 1;
  alpha = 1;
  render = !0;
  constructor(s, t = {}) {
    super(s), this.start = t.start || this.start, this.cp1 = t.cp1 || this.cp1, this.cp2 = t.cp2 || this.cp2, this.end = t.end || this.end, this.strokeStyle = t.strokeStyle || this.strokeStyle, this.lineWidth = t.lineWidth || this.lineWidth, this.alpha = t.alpha || this.alpha, this.render = t.render || this.render;
  }
};
ft = Cn([
  it("Curve")
], ft);
class xe {
  match(t, e) {
    return t.hasComponent(e, ft);
  }
  computeAABB(t, e) {
    const r = t.getComponent(e, ft), a = t.getComponent(e, I).worldMatrix, i = [], c = 30;
    for (let p = 0; p <= 1; p += 1 / c) {
      let v, d;
      if (r.cp2) {
        const g = 1 - p;
        v = g ** 3 * r.start[0] + 3 * g ** 2 * p * r.cp1[0] + 3 * g * p ** 2 * r.cp2[0] + p ** 3 * r.end[0], d = g ** 3 * r.start[1] + 3 * g ** 2 * p * r.cp1[1] + 3 * g * p ** 2 * r.cp2[1] + p ** 3 * r.end[1];
      } else {
        const g = 1 - p;
        v = g ** 2 * r.start[0] + 2 * g * p * r.cp1[0] + p ** 2 * r.end[0], d = g ** 2 * r.start[1] + 2 * g * p * r.cp1[1] + p ** 2 * r.end[1];
      }
      const w = Y(v, d);
      U(w, w, a), i.push(w);
    }
    let o = 1 / 0, h = 1 / 0, y = -1 / 0, u = -1 / 0;
    for (const p of i)
      o = Math.min(o, p[0]), h = Math.min(h, p[1]), y = Math.max(y, p[0]), u = Math.max(u, p[1]);
    return { minX: o, minY: h, maxX: y, maxY: u };
  }
  hit(t, e, r, n) {
    const a = t.getComponent(e, ft), c = t.getComponent(e, I).worldMatrix, o = nt();
    pt(o, c);
    const h = Y(r, n);
    U(h, h, o);
    const y = 50;
    let u = 1 / 0;
    for (let p = 0; p <= 1; p += 1 / y) {
      let v, d;
      if (a.cp2) {
        const A = 1 - p;
        v = A ** 3 * a.start[0] + 3 * A ** 2 * p * a.cp1[0] + 3 * A * p ** 2 * a.cp2[0] + p ** 3 * a.end[0], d = A ** 3 * a.start[1] + 3 * A ** 2 * p * a.cp1[1] + 3 * A * p ** 2 * a.cp2[1] + p ** 3 * a.end[1];
      } else {
        const A = 1 - p;
        v = A ** 2 * a.start[0] + 2 * A * p * a.cp1[0] + p ** 2 * a.end[0], d = A ** 2 * a.start[1] + 2 * A * p * a.cp1[1] + p ** 2 * a.end[1];
      }
      const w = h[0] - v, g = h[1] - d;
      u = Math.min(u, Math.sqrt(w * w + g * g));
    }
    return u <= (a.lineWidth || 5);
  }
}
var _n = Object.getOwnPropertyDescriptor, kn = (s, t, e, r) => {
  for (var n = r > 1 ? void 0 : r ? _n(t, e) : t, a = s.length - 1, i; a >= 0; a--)
    (i = s[a]) && (n = i(n) || n);
  return n;
};
let ut = class extends dt {
  commands = [];
  strokeStyle;
  fillStyle;
  lineWidth = 1;
  alpha = 1;
  render = !0;
  /** 🆕 缓存 Path2D 对象 */
  path2D;
  constructor(s, t = {}) {
    super(s), this.commands = t.commands || [], this.strokeStyle = t.strokeStyle || "#000000", this.fillStyle = t.fillStyle || void 0, this.lineWidth = t.lineWidth ?? 1, this.alpha = t.alpha ?? 1, this.render = t.render ?? !0, this.updatePath2D();
  }
  /** 添加一个命令 */
  addCommand(s) {
    this.commands.push(s), this.updatePath2D();
  }
  /** 清空路径 */
  clear() {
    this.commands.length = 0, this.updatePath2D();
  }
  /** 🆕 根据 commands 更新 Path2D 对象 */
  updatePath2D() {
    const s = new Path2D();
    for (const t of this.commands)
      switch (t.type) {
        case "moveTo":
          s.moveTo(t.x, t.y);
          break;
        case "lineTo":
          s.lineTo(t.x, t.y);
          break;
        case "quadraticCurveTo":
          s.quadraticCurveTo(t.cp[0], t.cp[1], t.end[0], t.end[1]);
          break;
        case "bezierCurveTo":
          s.bezierCurveTo(t.cp1[0], t.cp1[1], t.cp2[0], t.cp2[1], t.end[0], t.end[1]);
          break;
        case "arc":
          s.arc(t.center[0], t.center[1], t.radius, t.start, t.end, t.counterClockwise);
          break;
        case "arcTo":
          s.arcTo(t.cp1[0], t.cp1[1], t.cp2[0], t.cp2[1], t.radius);
          break;
        case "ellipse":
          s.ellipse(
            t.center[0],
            t.center[1],
            t.radiusX,
            t.radiusY,
            t.rotation ?? 0,
            t.start ?? 0,
            t.end ?? 2 * Math.PI,
            t.counterClockwise ?? !1
          );
          break;
        case "close":
          s.closePath();
          break;
      }
    this.path2D = s;
  }
};
ut = kn([
  it("Path")
], ut);
class Dt {
  offscreenCanvas;
  offscreenCtx;
  constructor() {
    this.offscreenCanvas = document.createElement("canvas"), this.offscreenCanvas.width = 1, this.offscreenCanvas.height = 1;
    const t = this.offscreenCanvas.getContext("2d");
    if (!t) throw new Error("Offscreen canvas context not available");
    this.offscreenCtx = t;
  }
  match(t, e) {
    return t.hasComponent(e, ut);
  }
  computeAABB(t, e) {
    const r = t.getComponent(e, ut), a = t.getComponent(e, I).worldMatrix, i = [];
    let c = [0, 0];
    const o = 20;
    for (const d of r.commands)
      switch (d.type) {
        case "moveTo":
          c = [d.x, d.y], i.push(Y(...c));
          break;
        case "lineTo":
          c = [d.x, d.y], i.push(Y(...c));
          break;
        case "quadraticCurveTo":
          for (let w = 0; w <= 1; w += 1 / o) {
            const g = 1 - w, A = g ** 2 * c[0] + 2 * g * w * d.cp[0] + w ** 2 * d.end[0], B = g ** 2 * c[1] + 2 * g * w * d.cp[1] + w ** 2 * d.end[1];
            i.push(Y(A, B));
          }
          c = [...d.end];
          break;
        case "bezierCurveTo":
          for (let w = 0; w <= 1; w += 1 / o) {
            const g = 1 - w, A = g ** 3 * c[0] + 3 * g ** 2 * w * d.cp1[0] + 3 * g * w ** 2 * d.cp2[0] + w ** 3 * d.end[0], B = g ** 3 * c[1] + 3 * g ** 2 * w * d.cp1[1] + 3 * g * w ** 2 * d.cp2[1] + w ** 3 * d.end[1];
            i.push(Y(A, B));
          }
          c = [...d.end];
          break;
        case "arc": {
          const [w, g] = d.center;
          for (let A = 0; A <= 1; A += 1 / o) {
            const B = d.start + A * (d.end - d.start), S = w + d.radius * Math.cos(B), W = g + d.radius * Math.sin(B);
            i.push(Y(S, W));
          }
          c = [w + d.radius * Math.cos(d.end), g + d.radius * Math.sin(d.end)];
          break;
        }
        case "arcTo":
          i.push(Y(d.cp1[0], d.cp1[1])), i.push(Y(d.cp2[0], d.cp2[1])), c = [...d.cp2];
          break;
        case "ellipse": {
          const [w, g] = d.center, A = d.radiusX, B = d.radiusY, S = d.rotation ?? 0;
          for (let W = 0; W <= 1; W += 1 / o) {
            const G = W * 2 * Math.PI, z = Math.cos(G), D = Math.sin(G), $ = w + A * z * Math.cos(S) - B * D * Math.sin(S), q = g + A * z * Math.sin(S) + B * D * Math.cos(S);
            i.push(Y($, q));
          }
          c = [w + A * Math.cos(0), g + B * Math.sin(0)];
          break;
        }
      }
    const h = i.map((d) => U(_t(), d, a));
    let y = 1 / 0, u = 1 / 0, p = -1 / 0, v = -1 / 0;
    for (const d of h)
      y = Math.min(y, d[0]), u = Math.min(u, d[1]), p = Math.max(p, d[0]), v = Math.max(v, d[1]);
    return { minX: y, minY: u, maxX: p, maxY: v };
  }
  hit(t, e, r, n) {
    const a = t.getComponent(e, ut), c = t.getComponent(e, I).worldMatrix, o = nt();
    pt(o, c);
    const h = Y(r, n);
    U(h, h, o);
    const y = a.commands.some((u) => u.type === "close");
    if (a.path2D) {
      const u = this.offscreenCtx;
      u.save(), u.clearRect(0, 0, 1, 1), u.lineWidth = a.lineWidth ?? 1;
      const p = y ? u.isPointInPath(a.path2D, h[0], h[1]) : u.isPointInStroke(a.path2D, h[0], h[1]);
      return u.restore(), p;
    } else
      return y ? this.isPointInPath(a, h[0], h[1]) : Dt.isPointNearPath(a, h[0], h[1]);
  }
  isPointInPath(t, e, r) {
    const n = this.offscreenCtx;
    n.save(), n.clearRect(0, 0, 1, 1), n.beginPath();
    for (const i of t.commands)
      switch (i.type) {
        case "moveTo":
          n.moveTo(i.x, i.y);
          break;
        case "lineTo":
          n.lineTo(i.x, i.y);
          break;
        case "quadraticCurveTo":
          n.quadraticCurveTo(i.cp[0], i.cp[1], i.end[0], i.end[1]);
          break;
        case "bezierCurveTo":
          n.bezierCurveTo(i.cp1[0], i.cp1[1], i.cp2[0], i.cp2[1], i.end[0], i.end[1]);
          break;
        case "arc":
          n.arc(i.center[0], i.center[1], i.radius, i.start, i.end, i.counterClockwise);
          break;
        case "arcTo":
          n.arcTo(i.cp1[0], i.cp1[1], i.cp2[0], i.cp2[1], i.radius);
          break;
        case "ellipse":
          n.ellipse(i.center[0], i.center[1], i.radiusX, i.radiusY, i.rotation ?? 0, 0, 2 * Math.PI);
          break;
        case "close":
          n.closePath();
          break;
      }
    const a = n.isPointInPath(e, r);
    return n.restore(), a;
  }
  static isPointNearPath(t, e, r) {
    const a = t.lineWidth ?? 5;
    let i = [0, 0], c = 1 / 0;
    for (const o of t.commands)
      switch (o.type) {
        case "moveTo":
          i = [o.x, o.y];
          break;
        case "lineTo": {
          const h = o.x - i[0], y = o.y - i[1];
          if (h !== 0 || y !== 0) {
            const u = ((e - i[0]) * h + (r - i[1]) * y) / (h * h + y * y), p = Math.max(0, Math.min(1, u)), v = i[0] + h * p, d = i[1] + y * p;
            c = Math.min(c, Math.hypot(e - v, r - d));
          }
          i = [o.x, o.y];
          break;
        }
        case "quadraticCurveTo":
          for (let h = 0; h <= 1; h += 1 / 50) {
            const y = 1 - h, u = y ** 2 * i[0] + 2 * y * h * o.cp[0] + h ** 2 * o.end[0], p = y ** 2 * i[1] + 2 * y * h * o.cp[1] + h ** 2 * o.end[1];
            c = Math.min(c, Math.hypot(e - u, r - p));
          }
          i = [...o.end];
          break;
        case "bezierCurveTo":
          for (let h = 0; h <= 1; h += 1 / 50) {
            const y = 1 - h, u = y ** 3 * i[0] + 3 * y ** 2 * h * o.cp1[0] + 3 * y * h ** 2 * o.cp2[0] + h ** 3 * o.end[0], p = y ** 3 * i[1] + 3 * y ** 2 * h * o.cp1[1] + 3 * y * h ** 2 * o.cp2[1] + h ** 3 * o.end[1];
            c = Math.min(c, Math.hypot(e - u, r - p));
          }
          i = [...o.end];
          break;
        case "arc": {
          const [h, y] = o.center, u = o.start, p = o.end, v = (p - u) / 50;
          for (let d = 0; d <= 50; d++) {
            const w = u + v * d, g = h + o.radius * Math.cos(w), A = y + o.radius * Math.sin(w);
            c = Math.min(c, Math.hypot(e - g, r - A));
          }
          i = [h + o.radius * Math.cos(p), y + o.radius * Math.sin(p)];
          break;
        }
        case "arcTo": {
          const [h, y] = i, [u, p] = o.cp1, [v, d] = o.cp2, w = o.radius, g = h - u, A = y - p, B = v - u, S = d - p, W = Math.atan2(A, g), z = (Math.atan2(S, B) - W + Math.PI * 3) % (Math.PI * 2) - Math.PI, D = W + z / 2, $ = u + w * Math.cos(D + Math.PI / 2), q = p + w * Math.sin(D + Math.PI / 2), H = Math.atan2(y - q, h - $), ot = Math.atan2(d - q, v - $);
          for (let V = 0; V <= 50; V++) {
            const L = V / 50, rt = H + (ot - H) * L, st = $ + w * Math.cos(rt), at = q + w * Math.sin(rt);
            c = Math.min(c, Math.hypot(e - st, r - at));
          }
          i = [v, d];
          break;
        }
        case "ellipse": {
          const [h, y] = o.center, u = o.radiusX, p = o.radiusY, v = o.rotation ?? 0;
          for (let d = 0; d <= 50; d++) {
            const w = d / 50 * 2 * Math.PI, g = Math.cos(w), A = Math.sin(w), B = h + u * g * Math.cos(v) - p * A * Math.sin(v), S = y + u * g * Math.sin(v) + p * A * Math.cos(v);
            c = Math.min(c, Math.hypot(e - B, r - S));
          }
          i = [h + u * Math.cos(0), y + p * Math.sin(0)];
          break;
        }
      }
    return c <= Math.max(5, a / 2);
  }
}
class Ce {
  match(t, e) {
    return !0;
  }
  strategies;
  // 某一组子节点的包围盒，遍历完子节点后 更新
  none = () => ({ minX: 1 / 0, minY: 1 / 0, maxX: -1 / 0, maxY: -1 / 0 });
  constructor() {
    this.strategies = [], this.strategies.push(new ve()), this.strategies.push(new ge()), this.strategies.push(new we()), this.strategies.push(new Me()), this.strategies.push(new xe()), this.strategies.push(new Dt());
  }
  compute(t, e) {
    for (const r of this.strategies)
      if (r.match(t, e))
        return r.computeAABB(t, e);
    return { minX: 1 / 0, minY: 1 / 0, maxX: -1 / 0, maxY: -1 / 0 };
  }
  exec(t, e, r, n, a) {
    let i = t.ecs.getComponent(e, N);
    if (i || (i = new N(), t.ecs.addComponent(e, i)), !i.dirty) return;
    const c = this.compute(t.ecs, e);
    if (i.setSelf(c), i.setChildren(n.childrenAABB || this.none()), i.updateTotalAABB(), r !== null && a !== null) {
      let o = t.ecs.getComponent(r, N);
      o || (o = new N(), t.ecs.addComponent(r, o)), a.childrenAABB || (a.childrenAABB = this.none()), this.merge(a.childrenAABB, i.totalAABB), o.dirty = !0;
    }
  }
  merge(t, e) {
    t.minX = Math.min(t.minX, e.minX), t.minY = Math.min(t.minY, e.minY), t.maxX = Math.max(t.maxX, e.maxX), t.maxY = Math.max(t.maxY, e.maxY);
  }
}
class An {
  match(t, e) {
    return t.hasComponent(e, ut);
  }
  /**
   * 执行渲染逻辑
   */
  exec(t, e) {
    const r = t.ecs, n = r.canvas.getContext("2d"), a = r.getComponent(e, I), i = r.getComponent(e, ut);
    if (!i.render || !i.commands.length) return;
    n.save(), n.globalAlpha = i.alpha;
    const c = a.worldMatrix;
    n.setTransform(
      c[0],
      // a = m00
      c[1],
      // b = m10
      c[3],
      // c = m01
      c[4],
      // d = m11
      c[6],
      // e = m20 (平移x)
      c[7]
      // f = m21 (平移y)
    ), n.beginPath();
    for (const o of i.commands)
      switch (o.type) {
        case "moveTo":
          n.moveTo(o.x, o.y);
          break;
        case "lineTo":
          n.lineTo(o.x, o.y);
          break;
        case "quadraticCurveTo":
          n.quadraticCurveTo(o.cp[0], o.cp[1], o.end[0], o.end[1]);
          break;
        case "bezierCurveTo":
          n.bezierCurveTo(o.cp1[0], o.cp1[1], o.cp2[0], o.cp2[1], o.end[0], o.end[1]);
          break;
        case "arc":
          n.arc(o.center[0], o.center[1], o.radius, o.start, o.end, !!o.counterClockwise);
          break;
        case "arcTo":
          n.arcTo(o.cp1[0], o.cp1[1], o.cp2[0], o.cp2[1], o.radius);
          break;
        case "ellipse":
          n.ellipse(
            o.center[0],
            o.center[1],
            o.radiusX,
            o.radiusY,
            o.rotation ?? 0,
            o.start ?? 0,
            o.end ?? 2 * Math.PI,
            !!o.counterClockwise
          );
          break;
        case "close":
          n.closePath();
          break;
      }
    i.fillStyle && (n.fillStyle = i.fillStyle, n.fill()), i.strokeStyle && i.lineWidth > 0 && (n.strokeStyle = i.strokeStyle, n.lineWidth = i.lineWidth, n.stroke()), n.restore();
  }
}
class Pn {
  match(t, e) {
    return t.hasComponent(e, lt);
  }
  exec(t, e) {
    const r = t.ecs, n = r.canvas.getContext("2d"), a = r.getComponent(e, I), i = r.getComponent(e, lt);
    if (!i.render || i.points.length < 2) return;
    n.save(), n.globalAlpha = i.alpha;
    const c = a.worldMatrix;
    n.setTransform(
      c[0],
      // a
      c[1],
      // b
      c[3],
      // c
      c[4],
      // d
      c[6],
      // e
      c[7]
      // f
    ), n.beginPath();
    const o = i.points;
    n.moveTo(o[0][0], o[0][1]);
    for (let h = 1; h < o.length; h++)
      n.lineTo(o[h][0], o[h][1]);
    i.closed && n.closePath(), i.closed && i.fillStyle && (n.fillStyle = i.fillStyle, n.fill()), i.strokeStyle && i.lineWidth > 0 && (n.strokeStyle = i.strokeStyle, n.lineWidth = i.lineWidth, n.stroke()), n.restore();
  }
}
class bn {
  match(t, e) {
    return t.hasComponent(e, ft);
  }
  exec(t, e) {
    const r = t.ecs, n = r.canvas.getContext("2d"), a = r.getComponent(e, I), i = r.getComponent(e, ft);
    if (!i.render) return;
    n.save(), n.globalAlpha = i.alpha;
    const c = a.worldMatrix;
    n.setTransform(
      c[0],
      // a = m00
      c[1],
      // b = m10
      c[3],
      // c = m01
      c[4],
      // d = m11
      c[6],
      // e = m20 (平移x)
      c[7]
      // f = m21 (平移y)
    ), n.beginPath(), n.moveTo(i.start[0], i.start[1]), i.cp2 ? n.bezierCurveTo(
      i.cp1[0],
      i.cp1[1],
      i.cp2[0],
      i.cp2[1],
      i.end[0],
      i.end[1]
    ) : n.quadraticCurveTo(
      i.cp1[0],
      i.cp1[1],
      i.end[0],
      i.end[1]
    ), i.strokeStyle && i.lineWidth > 0 && (n.strokeStyle = i.strokeStyle, n.lineWidth = i.lineWidth, n.stroke()), n.restore();
  }
}
class Tn extends Wt {
  constructor(t, e) {
    super(t, e), this.engine = t, this.sceneTree = e;
  }
  ctx;
  processes = [];
  onInit() {
    const t = this.ecs.canvas;
    if (!t) throw new Error("Canvas not set on ECS");
    const e = t.getContext("2d");
    if (!e) throw new Error("Cannot get CanvasRenderingContext2D");
    this.ctx = e, this.processes.push(
      new ye(),
      new an(),
      new ln(),
      new mn(),
      new Pn(),
      new bn(),
      new An()
    ), this.bboxProcess = new Ce();
  }
  bboxProcess;
  update() {
    console.log("渲染"), this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    const t = /* @__PURE__ */ new Map();
    t.set(null, { dirty: !1 });
    const e = this.sceneTree.displayList;
    for (let r = 0; r < e.length; r++) {
      const [n, a] = e[r];
      t.has(n) || t.set(n, {});
      const i = t.get(n), c = t.get(a);
      for (const o of this.processes)
        o.match(this.ecs, n) && o.exec(this, n, a, i, c);
    }
    for (let r = e.length - 1; r >= 0; r--) {
      const [n, a] = e[r], i = t.get(n), c = t.get(a);
      this.bboxProcess.exec(this, n, a, i, c);
    }
  }
}
class En {
  match(t, e) {
    return !0;
  }
  strategies;
  // 某一组子节点的包围盒，遍历完子节点后 更新
  constructor() {
    this.strategies = [], this.strategies.push(new ve()), this.strategies.push(new ge()), this.strategies.push(new we()), this.strategies.push(new Me()), this.strategies.push(new xe()), this.strategies.push(new Dt());
  }
  hit(t, e, r, n) {
    for (const a of this.strategies)
      if (a.match(t, e))
        return a.hit(t, e, r, n);
    return !1;
  }
  exec(t, e, r, n, a) {
  }
}
class _e extends Wt {
  ctx;
  eventEntities = [];
  bboxProcess;
  transformProcess;
  RenderableHitProcess;
  onInit() {
    this.transformProcess = new ye(), this.bboxProcess = new Ce(), this.RenderableHitProcess = new En();
  }
  hitAABB(t, e, r) {
    return t >= r.minX && e >= r.minY && t <= r.maxX && e <= r.maxY;
  }
  hitRenderable(t, e, r) {
    return this.RenderableHitProcess.hit(this.ecs, r, t, e);
  }
  hitTree(t, e) {
    const r = this.sceneTree, n = (i) => {
      if (i === null) return null;
      const c = this.ecs.getComponent(i.entityId, N);
      if (!this.hitAABB(t, e, c.totalAABB)) return null;
      for (let o = i.children.length - 1; o >= 0; o--) {
        const h = n(i.children[o]);
        if (h) return h;
      }
      return this.hitAABB(t, e, c.selfAABB) && this.hitRenderable(t, e, i.entityId) ? i : null;
    }, a = n(r.root);
    return a !== null ? a.entityId : null;
  }
  pickEntityAt(t, e) {
    return this.updateTree(), this.hitTree(t, e);
  }
  updateTree() {
    const t = /* @__PURE__ */ new Map();
    t.set(null, { dirty: !1 });
    const e = this.sceneTree.displayList;
    for (let r = 0; r < e.length; r++) {
      const [n, a] = e[r];
      t.has(n) || t.set(n, {});
      const i = t.get(n), c = t.get(a);
      this.transformProcess.exec(this, n, a, i, c);
    }
    for (let r = e.length - 1; r >= 0; r--) {
      const [n, a] = e[r], i = t.get(n), c = t.get(a);
      this.bboxProcess.exec(this, n, a, i, c);
    }
  }
  update() {
  }
}
class Bn {
  listeners = {};
  /** 监听事件 */
  on(t, e) {
    (this.listeners[t] ??= /* @__PURE__ */ new Set()).add(e);
  }
  /** 取消监听 */
  off(t, e) {
    e ? this.listeners[t]?.delete(e) : delete this.listeners[t];
  }
  /** 触发事件 */
  emit(t, ...e) {
    const r = this.listeners[t];
    if (r)
      for (const n of r) n(...e);
  }
  /** 清除监听器 */
  clear(t) {
    t ? delete this.listeners[t] : this.listeners = {};
  }
}
class Sn extends Wt {
  constructor(t, e) {
    super(t, e), this.engine = t, this.sceneTree = e;
  }
  ctx;
  processes = [];
  onInit() {
    const t = this.ecs.canvas;
    if (!t) throw new Error("Canvas not set on ECS");
    const e = t.getContext("2d");
    if (!e) throw new Error("Cannot get CanvasRenderingContext2D");
    this.ctx = e;
  }
  update() {
    if (!this.engine.boxDebug) return;
    const t = /* @__PURE__ */ new Map();
    t.set(null, { dirty: !1 });
    const e = this.sceneTree.displayList;
    for (let r = e.length - 1; r >= 0; r--) {
      const [n, a] = e[r];
      t.has(n) || t.set(n, {}), this.drawTotal(n), this.drawSelf(n);
    }
  }
  drawSelf(t) {
    const e = this.ecs.getComponent(t, N);
    e && this.draw(e.totalAABB, "#ff0000", 1);
  }
  drawTotal(t) {
    const e = this.ecs.getComponent(t, N);
    e && this.draw(e.selfAABB, "blue", 3);
  }
  drawChildren(t) {
    const e = this.ecs.getComponent(t, N);
    e && this.draw(e.childrenAABB, "green", 2);
  }
  draw(t, e = "#ff0000", r = 1) {
    const n = this.ctx;
    n.save(), n.beginPath(), n.moveTo(t.minX, t.minY), n.lineTo(t.maxX, t.minY), n.lineTo(t.maxX, t.maxY), n.lineTo(t.minX, t.maxY), n.closePath(), n.strokeStyle = e, n.lineWidth = r, n.stroke(), n.restore();
  }
}
var In = Object.getOwnPropertyDescriptor, On = (s, t, e, r) => {
  for (var n = r > 1 ? void 0 : r ? In(t, e) : t, a = s.length - 1, i; a >= 0; a--)
    (i = s[a]) && (n = i(n) || n);
  return n;
};
let Rt = class {
  events = /* @__PURE__ */ new Map();
  /** 注册事件 */
  on(s, t) {
    this.events.has(s) || this.events.set(s, []), this.events.get(s).push(t);
  }
  /** 移除事件 */
  off(s, t) {
    if (!t)
      this.events.delete(s);
    else {
      const e = this.events.get(s);
      if (!e) return;
      this.events.set(s, e.filter((r) => r !== t));
    }
  }
  /** 触发事件，返回 true 表示阻止冒泡 */
  emit(s, t, e) {
    const r = this.events.get(s);
    if (!r) return !1;
    let n = !1;
    for (const a of r)
      a(t, e) === !0 && (n = !0);
    return n;
  }
};
Rt = On([
  it("Event")
], Rt);
class Yn extends Wt {
  onInit() {
    this.initPointerEvents();
  }
  /** 初始化事件监听 */
  initPointerEvents() {
    const t = this.ecs.canvas;
    if (!t) throw new Error("ECS.canvas 未设置");
    const e = [
      // 鼠标事件
      "click"
      // "dblclick",
      // "mousedown",
      // "mouseup",
      // "mousemove",
      // "contextmenu",
      // "wheel",
      // // 触摸事件
      // "touchstart",
      // "touchmove",
      // "touchend",
      // "touchcancel",
      // // 指针事件
      // "pointerdown",
      // "pointermove",
      // "pointerup",
      // "pointercancel",
    ];
    for (const r of e)
      t.addEventListener(r, (n) => this.handleEvent(n, r));
  }
  /** 提取带坐标的事件类型 */
  handleEvent(t, e) {
    const n = this.ecs.canvas.getBoundingClientRect();
    let a = 0, i = 0;
    if ("clientX" in t && "clientY" in t)
      a = t.clientX - n.left, i = t.clientY - n.top;
    else if ("touches" in t && t.touches.length > 0) {
      const o = t.touches[0];
      a = o.clientX - n.left, i = o.clientY - n.top;
    }
    const c = this.ecs.getSystem(_e).pickEntityAt(a, i);
    c != null && this.propagateEvent(c, e, t);
  }
  /** 冒泡事件分发 */
  propagateEvent(t, e, r) {
    let n = this.sceneTree.get(t);
    for (; n; ) {
      const a = this.ecs.getComponent(n.entityId, Rt);
      if (a && a.emit(e, r, n.entityId))
        break;
      n = n.parent;
    }
  }
  update() {
  }
}
class Xn {
  boxDebug = !1;
  ecs;
  ticker;
  sceneTree;
  rootEntity;
  event;
  constructor(t) {
    this.event = new Bn(), this.ecs = new ze(), this.ecs.canvas = t, this.rootEntity = new rn(this), this.sceneTree = new Le(this.rootEntity.entityId), this.ecs.addSystem(new Tn(this, this.sceneTree)), this.ecs.addSystem(new Sn(this, this.sceneTree)), this.ecs.addSystem(new _e(this, this.sceneTree)), this.ecs.addSystem(new Yn(this, this.sceneTree)), this.ticker = new He(), this.ticker.add((e) => this.ecs.update(e));
  }
  start() {
    this.ticker.start(), this.event.emit("start");
  }
  stop() {
    this.ticker.stop(), this.event.emit("stop");
  }
  /**
   * 在场景树中添加一个实体
   * @param entityId 新实体ID
   * @param parentId 父实体ID, 默认挂到根节点
   */
  add(t, e) {
    if (!this.ecs.hasEntity(t)) throw new Error(`Entity ${t} not exists`);
    if (e && !this.ecs.hasEntity(e)) throw new Error(`Parent entity ${e} not found`);
    if (e && !this.sceneTree.has(e))
      throw new Error(`Entity ${e} not exists`);
    this.sceneTree.add(t, e), this.event.emit("add", t);
  }
  /**
   * 将子节点添加到父节点
   */
  setParent(t, e) {
    if (!this.ecs.hasEntity(e)) throw new Error(`Entity ${e} not exists`);
    if (t && !this.ecs.hasEntity(t)) throw new Error(`Parent entity ${t} not found`);
    if (!this.sceneTree.has(t))
      throw new Error(`Entity ${t} not exists`);
    const r = this.sceneTree.get(t), n = this.sceneTree.get(e);
    r.addChild(n), this.event.emit("setParent", t, e);
  }
  /**
   * 删除实体及其子节点
   */
  remove(t) {
    this.sceneTree.destory(t), this.ecs.removeEntity(t), this.event.emit("remove", t);
  }
  /**
   * 获取实体的父节点
   */
  getParent(t) {
    return this.sceneTree.getParent(t);
  }
  /**
   * 获取实体对应的 SceneNode
   */
  getNode(t) {
    return this.sceneTree.get(t);
  }
  /**
   * 清空场景树（保留根节点）
   */
  clear() {
    this.sceneTree.clear(), this.event.emit("clear");
  }
}
const Rn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get BoundingBoxComponent() {
    return N;
  },
  get Circle() {
    return et;
  },
  get Curve() {
    return ft;
  },
  get EventComponent() {
    return Rt;
  },
  get Image() {
    return ht;
  },
  get Path() {
    return ut;
  },
  get Polyline() {
    return lt;
  },
  get Rect() {
    return ct;
  },
  get Transform() {
    return I;
  }
}, Symbol.toStringTag, { value: "Module" }));
async function Wn(s, t, e) {
  try {
    const r = await fetch(s, { mode: "cors" });
    if (!r.ok)
      throw new Error(`Failed to load image: ${s}, status ${r.status}`);
    const n = await r.blob();
    if (t) {
      const [a, i, c, o] = t;
      return await createImageBitmap(n, a, i, c, o, e);
    } else
      return await createImageBitmap(n, e);
  } catch (r) {
    throw console.error("loadImageBitmap error:", r), r;
  }
}
export {
  N as BoundingBoxComponent,
  et as Circle,
  Rn as Components,
  ft as Curve,
  Xn as Engine,
  Rt as EventComponent,
  ht as Image,
  ut as Path,
  lt as Polyline,
  ct as Rect,
  I as Transform,
  Wn as loadImageBitmap
};
//# sourceMappingURL=web-ecs.es.js.map
