/// <reference types="node" />
import { Task, Context, derived, PathResolver } from 'dopees-chain';
import { CompilerOptions } from 'typescript';
export { CompilerOptions };
export interface Options {
    sourceRoot: string;
    distRoot: string;
    compilerOptions?: CompilerOptions;
}
interface SourceInfo {
    sourceCode: string;
    sourcePath: string;
}
declare class TranspilerState implements derived.FileMapperState {
    sourceResolver: PathResolver;
    selector: (path: string, context: Context) => boolean;
    innerStateKey: string;
    compilerOptions?: CompilerOptions;
    constructor(options: Options);
}
export declare class TypeScriptTranspiler extends derived.FileMapper<Options, SourceInfo, TranspilerState> {
    name: string;
    protected generate(state: TranspilerState, _task: Task, innerState: SourceInfo, _context: Context): Buffer | Promise<Buffer>;
    protected readSource(_: any, task: Task, context: Context): Promise<{
        sourceCode: string;
        sourcePath: string;
    }>;
    protected init(options: Options): TranspilerState;
}
export declare function typescript(opts: Options): import("dopees-chain/lib/task").Executor;
