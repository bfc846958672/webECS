import { Engine } from './Engine.ts';
import { Transform } from '../components/Transform.ts';
export declare class RootEntity {
    private engine;
    readonly entityId: number;
    constructor(engine: Engine);
    /**
     * 获取 Transform 组件
     */
    get transform(): Transform | undefined;
}
