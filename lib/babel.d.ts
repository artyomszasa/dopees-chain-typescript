import { Executor, Task, Context } from 'dopees-chain';
export interface Options {
    sourceRoot: string;
    distRoot: string;
    saveAllDependencies?: boolean;
    allDependenciesKey?: string;
    updateExternalImports?: boolean;
}
export declare namespace Options {
    const defaultAllDependenciesKey = "js.all.dependencies";
}
export interface DependencyEntry {
    mtime: Date;
    source: string;
    dependencies: string[];
}
export declare namespace DependencyHelper {
    function getDependencies(context: Context, key?: string): Promise<DependencyEntry[]>;
    function setDependencies(context: Context, task: Task, dependencies: string[], key?: string): Promise<void>;
    function setDependencies(context: Context, path: string, mtime: Date, dependencies: string[], key?: string): Promise<void>;
}
export declare function inlineView(opts: Options): Executor;
