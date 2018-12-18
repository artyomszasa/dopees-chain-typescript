export interface Options {
    sourceRoot: string;
    buildRoot: string;
    targetRoot: string;
    saveAllDependencies?: boolean;
    allDependenciesKey?: string;
    updateExternalImports?: boolean;
}
export { DependencyEntry } from './babel';
export declare function dopees(options: Options): import("dopees-chain/lib/task").Executor;
