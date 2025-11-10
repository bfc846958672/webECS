import { Engine } from '../Engine';
export interface IComponent {
}
export type ComponentConstructor<T extends IComponent> = new (engine: Engine | null, props?: Partial<T>) => T;
