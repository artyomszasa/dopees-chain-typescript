import * as ts from 'typescript';
import { Task, Context, FileName, Helpers as h, derived, PathResolver, ReversePathResolver } from 'dopees-chain';
import * as fspath from 'path';
import { CompilerOptions } from 'typescript';

// re-export
export { CompilerOptions };

export interface Options {
  //sourceResolver?: (path: string, basePath?: string) => string;
  sourceRoot: string,
  distRoot: string,
  compilerOptions?: CompilerOptions
}

const extTs = /\.ts$/;
const extJs = /\.js$/;

interface SourceInfo {
  sourceCode: string;
  sourcePath: string;
}

class TranspilerState implements derived.FileMapperState {
  sourceResolver: PathResolver;
  selector: (path: string, context: Context) => boolean;
  innerStateKey: string;
  compilerOptions?: CompilerOptions;
  constructor(options: Options) {
    this.sourceResolver = ReversePathResolver.from({
      sourceRoot: options.sourceRoot,
      sourceExt: 'ts',
      targetRoot: options.distRoot,
      targetExt: 'js'
    });
    this.selector = (path: string, context: Context) => {
      const distRoot = fspath.isAbsolute(options.distRoot) ? options.distRoot : fspath.normalize(fspath.join(context.basePath, options.distRoot));
      return path.endsWith('.js') && path.startsWith(distRoot);
    };
    this.innerStateKey = 'typescript.source';
    this.compilerOptions = options.compilerOptions;
  }
}

export class TypeScriptTranspiler extends derived.FileMapper<Options, SourceInfo, TranspilerState> {
  name = 'typescript';
  protected generate(state: TranspilerState, _task: Task, innerState: SourceInfo, _context: Context): Buffer | Promise<Buffer> {
    const result = ts.transpileModule(innerState.sourceCode, {
      fileName: innerState.sourcePath,
      compilerOptions: {
        lib: ["es6", "dom", "esnext.asynciterable"],
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        inlineSourceMap: true,
        strict: true,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        ...state.compilerOptions
      }
    });
    return Buffer.from(result.outputText, 'utf-8');
  }

  protected async readSource(_: any, task: Task, context: Context) {
    const sourceCode = await context.getContents(task, 'utf-8');
    const sourcePath = (<FileName>task.name).path;
    return { sourceCode, sourcePath };
  }

  protected init(options: Options) {
    return new TranspilerState(options);
  }
}

export function typescript(opts: Options) {
  if (!opts) {
    throw new Error('options mut be specified');
  }
  return new TypeScriptTranspiler().createExecutor(opts);
}