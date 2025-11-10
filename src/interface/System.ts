import { IAABB } from "./AABB.ts";

export interface IShareContext { 
    dirty: boolean,
    childrenAABB?: IAABB,
}
