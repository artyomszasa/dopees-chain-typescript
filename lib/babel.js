"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const babel = require("@babel/core");
const dopees_chain_1 = require("dopees-chain");
const fspath = require("path");
const fs = require("fs");
const t = require("@babel/types");
const traverse_1 = require("@babel/traverse");
const fsp = fs.promises;
const asDefaultImport = (node) => {
    if (1 == node.specifiers.length && 'ImportDefaultSpecifier' === node.specifiers[0].type) {
        return {
            id: node.specifiers[0].local,
            source: node.source.value,
            eq(other) {
                return this.id === other.id && this.source === other.source;
            }
        };
    }
    return null;
};
const findDefaultImports = (ast, action) => {
    return traverse_1.default(ast, {
        ImportDeclaration(path) {
            const node = path.node;
            const decl = asDefaultImport(node);
            if (null !== decl) {
                action(decl, path);
            }
        }
    });
};
const findAllDependencies = (ast, action) => {
    return traverse_1.default(ast, {
        ImportDeclaration(path) {
            const node = path.node;
            action(node.source.value);
        }
    });
};
const walkAllDependencies = (ast, action) => {
    return traverse_1.default(ast, {
        ImportDeclaration(path) {
            const node = path.node;
            const replacement = action(node);
            if (replacement) {
                path.replaceWith(replacement);
            }
        }
    });
};
var Options;
(function (Options) {
    Options.defaultAllDependenciesKey = 'js.all.dependencies';
})(Options = exports.Options || (exports.Options = {}));
// export interface DependencyEntry {
//   mtime: Date,
//   source: string,
//   dependency: string;
// }
var DependencyHelper;
(function (DependencyHelper) {
    const sync = new dopees_chain_1.mutex.Mutex();
    async function getDependencies(context, key) {
        const deps = await context.storage.getObject(key || Options.defaultAllDependenciesKey);
        return deps || [];
    }
    DependencyHelper.getDependencies = getDependencies;
    function storeDependencies(context, deps, key) {
        return context.storage.setObject(key || Options.defaultAllDependenciesKey, deps);
    }
    async function clearDependencies(context, source, key) {
        await sync.lock();
        try {
            const deps = (await getDependencies(context, key)).splice(0);
            let index;
            while (-1 !== (index = deps.findIndex(e => e.source === source))) {
                deps.splice(index, 1);
            }
            await storeDependencies(context, deps, key);
        }
        finally {
            sync.release();
        }
    }
    async function setDependencies(context, arg1, arg2, arg3, arg4) {
        let path;
        let mtime;
        let dependencies;
        let key;
        if (arg1 instanceof dopees_chain_1.Task) {
            if (!Array.isArray(arg2)) {
                throw new TypeError('dependencies must be an array value');
            }
            if ('string' !== typeof arg3) {
                throw new TypeError('key must be a string value');
            }
            if (arg1.name instanceof dopees_chain_1.FileName) {
                path = arg1.name.path;
                mtime = await dopees_chain_1.Helpers.getMtime(arg1, context).then(mtime => { if (mtime) {
                    return mtime;
                }
                else {
                    throw new Error(`unable to get mtime for ${arg1.name}`);
                } });
                dependencies = arg2;
                key = arg3;
            }
            else {
                throw new Error(`task must be file related: ${arg1.name}`);
            }
        }
        else {
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
            let index;
            while (-1 !== (index = deps.findIndex(e => e.source === path))) {
                deps.splice(index, 1);
            }
            deps.push({
                mtime: mtime,
                source: path,
                dependencies: dependencies
            });
            await storeDependencies(context, deps, key);
        }
        finally {
            sync.release();
        }
    }
    DependencyHelper.setDependencies = setDependencies;
})(DependencyHelper = exports.DependencyHelper || (exports.DependencyHelper = {}));
const extJs = /\.js$/;
function inlineView(opts) {
    if (!opts) {
        throw new Error('options mut be specified');
    }
    return async (task, context) => {
        const sourceRoot = fspath.normalize(fspath.isAbsolute(opts.sourceRoot) ? opts.sourceRoot : fspath.join(context.basePath, opts.sourceRoot));
        const distRoot = fspath.normalize(fspath.isAbsolute(opts.distRoot) ? opts.distRoot : fspath.join(context.basePath, opts.distRoot));
        const name = task.name;
        // [inlined js <--- js] case
        if (name instanceof dopees_chain_1.FileName && extJs.test(name.path) && name.path.startsWith(distRoot)) {
            const startTs = Date.now();
            // context.log('babel:dopees', task, 'starting...');
            const sourcePath = fspath.resolve(fspath.join(sourceRoot, fspath.relative(distRoot, name.path)));
            let sourceTask = dopees_chain_1.Task.file(sourcePath, context.basePath);
            context.log('babel:dopees', task, `resolved source => ${sourceTask.name}`);
            // execute dependency (.ts), possibly triggering subdependencies....
            sourceTask = await context.execute(sourceTask);
            const sourceName = sourceTask.name;
            let tryUsingCachedAst = false;
            // check if file already exists...
            let sourceMtime = null;
            let mtime = await fsp.stat(name.path).then(stats => stats.mtime, () => null);
            if (mtime) {
                // check if source if older (no direct mtime as some dependency of the source could have changed instead of
                // the source itself)...
                sourceMtime = await dopees_chain_1.Helpers.getMtime(sourceTask, context);
                if (sourceMtime && sourceMtime <= mtime) {
                    // no need to parse ast --> it is unchanged, though inlined contents may have changed...
                    context.log('typescript', task, 'up to date');
                    tryUsingCachedAst = true;
                }
            }
            let cachedAst = null;
            if (sourceMtime && tryUsingCachedAst) {
                const cache = await context.storage.getObject(`!babel:ast!${sourceName.path}`);
                if (cache && cache.mtime >= sourceMtime) {
                    cachedAst = cache.ast;
                }
            }
            const babelOptions = {
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
            let ast;
            let sourceCode = null;
            if (cachedAst) {
                context.log('babel:dopees', task, 'using cached ast');
                ast = cachedAst;
            }
            else {
                sourceCode = await context.getContents(sourceTask, 'utf-8');
                context.log('babel:dopees', task, 'parsing...');
                ast = await babel.parseAsync(sourceCode, babelOptions);
                context.log('babel:dopees', task, 'done parsing');
                if (sourceMtime) {
                    await context.storage.setObject(`!babel:ast!${sourceName.path}`, { mtime: sourceMtime, ast });
                }
            }
            // collect inlineables
            const toInline = [];
            findDefaultImports(ast, (decl) => {
                const { id, source } = decl;
                if (source.endsWith('.pug')) {
                    // get full path of the include
                    const initialFolder = fspath.dirname(sourceTask.name.path);
                    const htmlPath = fspath.normalize(fspath.join(initialFolder, source.replace(/\.pug$/, '.html')));
                    toInline.push({ htmlPath, id, source });
                }
            });
            const htmls = [];
            const subtasks = [];
            await Promise.all(toInline.map(async (item, index) => {
                const relativePath = fspath.relative(context.basePath, item.htmlPath);
                const subtask = dopees_chain_1.Task.file(relativePath, context.basePath);
                subtasks[index] = subtask;
                htmls[index] = await context.getContents(await context.execute(subtask), 'utf-8');
            }));
            context.log('babel:dopees', task, 'inlining');
            // all cahnges are performed on copy, original ast is cached...
            ast = t.cloneDeep(ast);
            // inline views.
            findDefaultImports(ast, (decl, path) => {
                const { id, source } = decl;
                const inlineableIndex = toInline.findIndex(e => e.id.name === id.name && e.source === source);
                if (-1 !== inlineableIndex) {
                    context.log('babel:dopees', task, `inlining ${source}`);
                    const html = htmls[inlineableIndex];
                    path.replaceWith(t.variableDeclaration('const', [
                        t.variableDeclarator(id, t.stringLiteral(html))
                    ]));
                }
            });
            // ensure .js in imports
            walkAllDependencies(ast, (node) => {
                const importPath = node.source.value;
                if (importPath && !importPath.endsWith('.js')) {
                    if (true === opts.updateExternalImports && !importPath.startsWith('./') && !importPath.startsWith('../')) {
                        node.source.value = fspath.join(fspath.relative(fspath.dirname(name.path), opts.distRoot), importPath + '.js');
                    }
                    else {
                        node.source.value += '.js';
                    }
                }
            });
            const res = await babel.transformFromAstAsync(ast, sourceCode || await context.getContents(sourceTask, 'utf-8'), babelOptions);
            context.log('babel:dopees', task, 'storing js');
            const result = await context.saveContents(task, Buffer.from(res.code, 'utf-8'), true);
            // save output ast
            await context.storage.setObject(`!babel:ast!${name.path}`, { mtime, ast });
            context.log('babel:dopees', task, 'done', Date.now() - startTs);
            // collect all depepndencies if requested
            if (true === opts.saveAllDependencies) {
                const deps = [];
                findAllDependencies(ast, (source) => deps.push(source));
                await DependencyHelper.setDependencies(context, task, deps, opts.allDependenciesKey);
            }
            return result;
        }
    };
}
exports.inlineView = inlineView;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFiZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYmFiZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBcUM7QUFDckMsK0NBQXNGO0FBQ3RGLCtCQUErQjtBQUMvQix5QkFBeUI7QUFDekIsa0NBQWtDO0FBQ2xDLDhDQUF5RDtBQUV6RCxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO0FBUXhCLE1BQU0sZUFBZSxHQUFHLENBQUMsSUFBeUIsRUFBMEIsRUFBRTtJQUM1RSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sSUFBSSx3QkFBd0IsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtRQUNyRixPQUFPO1lBQ0gsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztZQUM1QixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3pCLEVBQUUsQ0FBQyxLQUF3QjtnQkFDdkIsT0FBTyxJQUFJLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQ2hFLENBQUM7U0FDSixDQUFDO0tBQ0w7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMsQ0FBQTtBQUVELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxHQUFXLEVBQUUsTUFBa0YsRUFBRSxFQUFFO0lBQzdILE9BQU8sa0JBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDakIsaUJBQWlCLENBQUMsSUFBSTtZQUNwQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuQyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxDQUFDLElBQUks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