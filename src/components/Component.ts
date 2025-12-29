/**
 * 组件基类
 */
export class Component {
    static isComponent (instance: unknown): boolean {
        return instance instanceof Component;
    }
}
