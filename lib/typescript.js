"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const dopees_chain_1 = require("dopees-chain");
const fspath = require("path");
const extTs = /\.ts$/;
const extJs = /\.js$/;
class TranspilerState {
    constructor(options) {
        this.sourceResolver = dopees_chain_1.ReversePathResolver.from({
            sourceRoot: options.sourceRoot,
            sourceExt: 'ts',
            targetRoot: options.distRoot,
            targetExt: 'js'
        });
        this.selector = (path, context) => {
            const distRoot = fspath.isAbsolute(options.distRoot) ? options.distRoot : fspath.normalize(fspath.join(context.basePath, options.distRoot));
            return path.endsWith('.js') && path.startsWith(distRoot);
        };
        this.innerStateKey = 'typescript.source';
        this.compilerOptions = options.compilerOptions;
    }
}
class TypeScriptTranspiler extends dopees_chain_1.derived.FileMapper {
    constructor() {
        super(...arguments);
        this.name = 'typescript';
    }
    generate(state, _task, innerState, _context) {
        const result = ts.transpileModule(innerState.sourceCode, {
            fileName: innerState.sourcePath,
            compilerOptions: {
                lib: ["es6", "dom", "esnext.asynciterable"],
                target: ts.ScriptTarget.ESNext,
                module: ts.ModuleKind.ESNext,
                inlineSourceMap: true,
                inlineSources: true,
                strict: true,
                moduleResolution: ts.ModuleResolutionKind.NodeJs,
                ...state.compilerOptions
            }
        });
        return Buffer.from(result.outputText, 'utf-8');
    }
    async readSource(_, task, context) {
        const sourceCode = await context.getContents(task, 'utf-8');
        const sourcePath = task.name.path;
        return { sourceCode, sourcePath };
    }
    init(options) {
        return new TranspilerState(options);
    }
}
exports.TypeScriptTranspiler = TypeScriptTranspiler;
function typescript(opts) {
    if (!opts) {
        throw new Error('options mut be specified');
    }
    return new TypeScriptTranspiler().createExecutor(opts);
}
exports.typescript = typescript;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90eXBlc2NyaXB0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaUNBQWlDO0FBQ2pDLCtDQUFpSDtBQUNqSCwrQkFBK0I7QUFhL0IsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDO0FBQ3RCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQztBQU90QixNQUFNLGVBQWU7SUFLbkIsWUFBWSxPQUFnQjtRQUMxQixJQUFJLENBQUMsY0FBYyxHQUFHLGtDQUFtQixDQUFDLElBQUksQ0FBQztZQUM3QyxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7WUFDOUIsU0FBUyxFQUFFLElBQUk7WUFDZixVQUFVLEVBQUUsT0FBTyxDQUFDLFFBQVE7WUFDNUIsU0FBUyxFQUFFLElBQUk7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxPQUFnQixFQUFFLEVBQUU7WUFDakQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzVJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQztRQUNGLElBQUksQ0FBQyxhQUFhLEdBQUcsbUJBQW1CLENBQUM7UUFDekMsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDO0lBQ2pELENBQUM7Q0FDRjtBQUVELE1BQWEsb0JBQXFCLFNBQVEsc0JBQU8sQ0FBQyxVQUFnRDtJQUFsRzs7UUFDRSxTQUFJLEdBQUcsWUFBWSxDQUFDO0lBMkJ0QixDQUFDO0lBMUJXLFFBQVEsQ0FBQyxLQUFzQixFQUFFLEtBQVcsRUFBRSxVQUFzQixFQUFFLFFBQWlCO1FBQy9GLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRTtZQUN2RCxRQUFRLEVBQUUsVUFBVSxDQUFDLFVBQVU7WUFDL0IsZUFBZSxFQUFFO2dCQUNmLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsc0JBQXNCLENBQUM7Z0JBQzNDLE1BQU0sRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU07Z0JBQzlCLE1BQU0sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU07Z0JBQzVCLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixhQUFhLEVBQUUsSUFBSTtnQkFDbkIsTUFBTSxFQUFFLElBQUk7Z0JBQ1osZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLE1BQU07Z0JBQ2hELEdBQUcsS0FBSyxDQUFDLGVBQWU7YUFDekI7U0FDRixDQUFDLENBQUM7UUFDSCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRVMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFNLEVBQUUsSUFBVSxFQUFFLE9BQWdCO1FBQzdELE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDNUQsTUFBTSxVQUFVLEdBQWMsSUFBSSxDQUFDLElBQUssQ0FBQyxJQUFJLENBQUM7UUFDOUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRVMsSUFBSSxDQUFDLE9BQWdCO1FBQzdCLE9BQU8sSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEMsQ0FBQztDQUNGO0FBNUJELG9EQTRCQztBQUVELFNBQWdCLFVBQVUsQ0FBQyxJQUFhO0lBQ3RDLElBQUksQ0FBQyxJQUFJLEVBQUU7UUFDVCxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7S0FDN0M7SUFDRCxPQUFPLElBQUksb0JBQW9CLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekQsQ0FBQztBQUxELGdDQUtDIn0=