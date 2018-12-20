import * as babel from '@babel/core';
import { Executor, Task, Context, FileName, Helpers as h, mutex } from 'dopees-chain';
import * as fspath from 'path';
import * as fs from 'fs';
import * as t from '@babel/types';
import traverse, { TraversePath } from '@babel/traverse';

const fsp = fs.promises;

interface DefaultImportData {
  id: t.Identifier,
  source: string,
  eq(other: DefaultImportData): boolean;
}

const asDefaultImport = (node: t.ImportDeclaration): DefaultImportData|null => {
  if (1 == node.specifiers.length && 'ImportDefaultSpecifier' === node.specifiers[0].type) {
      return {
          id: node.specifiers[0].local,
          source: node.source.value,
          eq(other: DefaultImportData) {
              return this.id === other.id && this.source === other.source;
          }
      };
  }
  return null;
}

const findDefaultImports = (ast: t.Node, action: (decl: DefaultImportData, path: TraversePath<t.ImportDeclaration>) => void) => {
  return traverse(ast, {
      ImportDeclaration(path) {
        const node = path.node;
        const decl = asDefaultImport(node);
        if (null !== decl) {
            action(decl, path);
        }
      }
  })
};

const findAllDependencies = (ast: t.Node, action: (source: string) => void) => {
  return traverse(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      action(node.source.value);
    }
  });
};

const walkAllDependencies = (ast: t.Node, action: (node: t.ImportDeclaration) => t.ImportDeclaration|void) => {
  return traverse(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      const replacement = action(node);
      if (replacement) {
        path.replaceWith(replacement);
      }
    }
  });
};

export interface Options {
  sourceRoot: string;
  distRoot: string;
  saveAllDependencies?: boolean;
  allDependenciesKey?: string;
  updateExternalImports?: boolean
}

export namespace Options {
  export const defaultAllDependenciesKey = 'js.all.dependencies';
}

export interface DependencyEntry {
  mtime: Date,
  source: string,
  dependencies: string[]
}

// export interface DependencyEntry {
//   mtime: Date,
//   source: string,
//   dependency: string;
// }

export namespace DependencyHelper {

  const sync = new mutex.Mutex();

  export async function getDependencies(context: Context, key?: string) {
    const deps = await context.storage.getObject<DependencyEntry[]>(key || Options.defaultAllDependenciesKey);
    return deps || [];
  }
  function storeDependencies(context: Context, deps: DependencyEntry[], key?: string) {
    return context.storage.setObject(key || Options.defaultAllDependenciesKey, deps);
  }
  async function clearDependencies(context: Context, source: string, key?: string) {
    await sync.lock();
    try {
      const deps = (await getDependencies(context, key)).splice(0);
      let index: number;
      while (-1 !== (index = deps.findIndex(e => e.source === source))) {
        deps.splice(index, 1);
      }
      await storeDependencies(context, deps, key);
    } finally {
      sync.release();
    }
  }
  // function addDependency(context: Context, task: Task, dependency: string, key?: string): Promise<void>;
  // function addDependency(context: Context, path: string, mtime: Date, dependency: string, key?: string): Promise<void>;
  // async function addDependency(context: Context, arg1: Task|string, arg2: string|Date, arg3?: string, arg4?: string): Promise<void> {
  //   let path: string;
  //   let mtime: Date;
  //   let dependency: string;
  //   let key: string|undefined;
  //   if (arg1 instanceof Task) {
  //     if ('string' != typeof arg2) {
  //       throw new TypeError('dependency must be a string value');
  //     }
  //     if (arg1.name instanceof FileName) {
  //       path = arg1.name.path;
  //       mtime = await h.getMtime(arg1, context).then(mtime => { if (mtime) { return mtime; } else { throw new Error(`unable to get mtime for ${arg1.name}`); } });
  //       dependency = arg2;
  //       key = arg3;
  //     } else {
  //       throw new Error(`task must be file related: ${arg1.name}`);
  //     }
  //   } else {
  //     if (!(arg2 instanceof Date)) {
  //       throw new TypeError('mtime must be a date value');
  //     }
  //     if (undefined === arg3) {
  //       throw new TypeError('dependency must be a string value');
  //     }
  //     path = arg1;
  //     mtime = arg2;
  //     dependency = arg3;
  //     key = arg4;
  //   }
  //   // do add
  //   await sync.lock();
  //   try {
  //     const deps = (await getDependencies(context, key)).splice(0);
  //     const index = deps.findIndex(e => e.source === path && e.dependency === dependency);
  //     if (-1 !== index) {
  //       deps.splice(index, 1);
  //     }
  //     deps.push({
  //       source: path,
  //       mtime,
  //       dependency
  //     });
  //     await storeDependencies(context, deps, key);
  //   } finally {
  //     sync.release();
  //   }
  // }
  export function setDependencies(context: Context, task: Task, dependencies: string[], key?: string): Promise<void>;
  export function setDependencies(context: Context, path: string, mtime: Date, dependencies: string[], key?: string): Promise<void>;
  export async function setDependencies(context: Context, arg1: Task|string, arg2: string[]|Date, arg3?: string[]|string, arg4?: string): Promise<void> {
    let path: string;
    let mtime: Date;
    let dependencies: string[];
    let key: string|undefined;
    if (arg1 instanceof Task) {
      if (!Array.isArray(arg2)) {
        throw new TypeError('dependencies must be an array value');
      }
      if ('string' !== typeof arg3) {
        throw new TypeError('key must be a string value');
      }
      if (arg1.name instanceof FileName) {
        path = arg1.name.path;
        mtime = await h.getMtime(arg1, context).then(mtime => { if (mtime) { return mtime; } else { throw new Error(`unable to get mtime for ${arg1.name}`); } });
        dependencies = arg2;
        key = arg3;
      } else {
        throw new Error(`task must be file related: ${arg1.name}`);
      }
    } else {
      if (!(arg2 instanceof Date)) {
        throw new TypeError('mtime must be a date value');
      }
      if (undefined === arg3 || 'string' === typeof arg3) {
        throw new TypeError('dependencies must be an array value');
      }
      path = arg1;
      mtime = arg2;
      dependencies = arg3;
      key = arg4;
    }
    // do add
    await sync.lock();
    try {
      const deps = (await getDependencies(context, key)).splice(0);
      let index: number;
      while (-1 !== (index = deps.findIndex(e => e.source === path))) {
        deps.splice(index, 1);
      }
      deps.push({
        mtime: mtime,
        source: path,
        dependencies: dependencies
      });
      await storeDependencies(context, deps, key);
    } finally {
      sync.release();
    }
  }
}

const extJs = /\.js$/;

// interface PathMapping {
//   [path: string]: string
// }


// const inlineViewPlugin = (ast: t.Node, { mappings } : { mappings: PathMapping}) => {
//   t.traverse(ast, {
//     enter(node: t.Node) {
//       if (node.type
//     }
//   });
// };

interface ToInline {
  htmlPath: string;
  id: t.Identifier;
  source: string;
}

interface CachedAst {
  mtime: Date,
  ast: t.Node
}

export function inlineView(opts: Options): Executor {
  if (!opts) {
    throw new Error('options mut be specified');
  }
  return async (task: Task, context: Context) => {
    const sourceRoot = fspath.normalize(fspath.isAbsolute(opts.sourceRoot) ? opts.sourceRoot : fspath.join(context.basePath, opts.sourceRoot));
    const distRoot = fspath.normalize(fspath.isAbsolute(opts.distRoot) ? opts.distRoot : fspath.join(context.basePath, opts.distRoot));
    const name = task.name;
    // [inlined js <--- js] case
    if (name instanceof FileName && extJs.test(name.path) && name.path.startsWith(distRoot)) {
      const startTs = Date.now();
      // context.log('babel:dopees', task, 'starting...');
      const sourcePath = fspath.resolve(fspath.join(sourceRoot, fspath.relative(distRoot, name.path)));
      let sourceTask = Task.file(sourcePath, context.basePath);
      context.log('babel:dopees', task, `resolved source => ${sourceTask.name}`);
      // execute dependency (.ts), possibly triggering subdependencies....
      sourceTask = await context.execute(sourceTask);
      const sourceName = <FileName>sourceTask.name;

      let tryUsingCachedAst = false;
      // check if file already exists...
      let sourceMtime : Date | null = null;
      let mtime = await fsp.stat(name.path).then(stats => stats.mtime, () => null);
      if (mtime) {
        // check if source if older (no direct mtime as some dependency of the source could have changed instead of
        // the source itself)...
        sourceMtime = await h.getMtime(sourceTask, context);
        if (sourceMtime && sourceMtime <= mtime) {
          // no need to parse ast --> it is unchanged, though inlined contents may have changed...
          context.log('typescript', task, 'up to date');
          tryUsingCachedAst = true;
        }
      }
      let cachedAst: t.Node | null = null;
      if (sourceMtime && tryUsingCachedAst) {
        const cache = await context.storage.getObject<CachedAst>(`!babel:ast!${sourceName.path}`);
        if (cache && cache.mtime >= sourceMtime) {
          cachedAst = cache.ast;
        }
      }
      const babelOptions : babel.Options = {
        filename: name.path,
        ast: true,
        root: name.basePath || context.basePath,
        rootMode: 'root',
        plugins: ['syntax-dynamic-import'],
        inputSourceMap: true,
        sourceMaps: 'inline',
        parserOpts: {
          sourceType: 'module'
        }
      };
      let ast: t.Node;
      let sourceCode: string | null = null;
      if (cachedAst) {
        context.log('babel:dopees', task, 'using cached ast');
        ast = cachedAst;
      } else {
        sourceCode = await context.getContents(sourceTask, 'utf-8');
        context.log('babel:dopees', task, 'parsing...');
        ast = await babel.parseAsync(sourceCode, babelOptions);
        context.log('babel:dopees', task, 'done parsing');
        if (sourceMtime) {
          await context.storage.setObject(`!babel:ast!${sourceName.path}`, <CachedAst>{ mtime: sourceMtime, ast });
        }
      }
      // collect inlineables
      const toInline : ToInline[] = [];
      findDefaultImports(ast, (decl: DefaultImportData) => {
        const { id, source } = decl;
        if (source.endsWith('.pug')) {
          // get full path of the include
          const initialFolder = fspath.dirname((<FileName>sourceTask.name).path);
          const htmlPath = fspath.normalize(fspath.join(initialFolder, source.replace(/\.pug$/, '.html')));
          toInline.push({ htmlPath, id, source })
        }
      });
      const htmls: string[] = [];
      const subtasks: Task[] = [];
      await Promise.all(toInline.map(async (item, index) => {
        const relativePath = fspath.relative(context.basePath, item.htmlPath);
        const subtask = Task.file(relativePath, context.basePath);
        subtasks[index] = subtask;
        htmls[index] = await context.getContents(await context.execute(subtask), 'utf-8');
      }));
      context.log('babel:dopees', task, 'inlining');
      // all cahnges are performed on copy, original ast is cached...
      ast = t.cloneDeep(ast);
      // inline views.
      findDefaultImports(ast, (decl: DefaultImportData, path: TraversePath<t.ImportDeclaration>) => {
        const { id, source } = decl;
        const inlineableIndex = toInline.findIndex(e => e.id.name === id.name && e.source === source);
        if (-1 !== inlineableIndex) {
          context.log('babel:dopees', task, `inlining ${source}`);
          const html = htmls[inlineableIndex];
          path.replaceWith(
            t.variableDeclaration('const', [
              t.variableDeclarator(
                id,
                t.stringLiteral(html)
              )
            ])
          );
        }
      });
      // ensure .js in imports
      walkAllDependencies(ast, (node: t.ImportDeclaration) => {
        const importPath = node.source.value;
        if (importPath && !importPath.endsWith('.js')) {
          if (true === opts.updateExternalImports && !importPath.startsWith('./') && !importPath.startsWith('../')) {
            node.source.value = fspath.join(fspath.relative(fspath.dirname(name.path), opts.distRoot), importPath + '.js');
          } else {
            node.source.value += '.js';
          }
        }

      })
      const res = await babel.transformFromAstAsync(ast, sourceCode || await context.getContents(sourceTask, 'utf-8'), babelOptions);
      context.log('babel:dopees', task, 'storing js');
      const result = await context.saveContents(task, Buffer.from(res.code, 'utf-8'), true);
      // save output ast
      await context.storage.setObject(`!babel:ast!${name.path}`, <CachedAst>{ mtime, ast })
      context.log('babel:dopees', task, 'done', Date.now() - startTs);
      // collect all depepndencies if requested
      if (true === opts.saveAllDependencies) {
        const deps: string[] = [];
        findAllDependencies(ast, (source: string) => deps.push(source));
        await DependencyHelper.setDependencies(context, task, deps, opts.allDependenciesKey);
      }
      return result;
    }
  };
}
