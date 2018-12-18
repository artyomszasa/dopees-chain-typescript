"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = require("./typescript");
const babel_1 = require("./babel");
const dopees_chain_1 = require("dopees-chain");
function dopees(options) {
    const { targetRoot, buildRoot, sourceRoot, updateExternalImports } = options;
    return dopees_chain_1.Executors.combine([
        typescript_1.typescript({ sourceRoot: sourceRoot, distRoot: buildRoot }),
        babel_1.inlineView({
            sourceRoot: buildRoot,
            distRoot: targetRoot,
            saveAllDependencies: options.saveAllDependencies,
            allDependenciesKey: options.allDependenciesKey,
            updateExternalImports
        })
    ]);
}
exports.dopees = dopees;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9wZWVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2RvcGVlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDZDQUEwQztBQUMxQyxtQ0FBcUM7QUFDckMsK0NBQXlDO0FBYXpDLFNBQWdCLE1BQU0sQ0FBQyxPQUFnQjtJQUNyQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUscUJBQXFCLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDN0UsT0FBTyx3QkFBUyxDQUFDLE9BQU8sQ0FBQztRQUN2Qix1QkFBVSxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUM7UUFDM0Qsa0JBQVUsQ0FBQztZQUNULFVBQVUsRUFBRSxTQUFTO1lBQ3JCLFFBQVEsRUFBRSxVQUFVO1lBQ3BCLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxtQkFBbUI7WUFDaEQsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLGtCQUFrQjtZQUM5QyxxQkFBcUI7U0FDckIsQ0FBQztLQUNKLENBQUMsQ0FBQztBQUNMLENBQUM7QUFaRCx3QkFZQyJ9