import { typescript } from "./typescript";
import { inlineView } from "./babel";
import { Executors } from "dopees-chain";

export interface Options {
  sourceRoot: string;
  buildRoot: string;
  targetRoot: string;
  saveAllDependencies?: boolean;
  allDependenciesKey?: string;
  updateExternalImports?: boolean
}

export { DependencyEntry } from './babel';

export function dopees(options: Options) {
  const { targetRoot, buildRoot, sourceRoot, updateExternalImports } = options;
  return Executors.combine([
    typescript({ sourceRoot: sourceRoot, distRoot: buildRoot }),
    inlineView({
      sourceRoot: buildRoot,
      distRoot: targetRoot,
      saveAllDependencies: options.saveAllDependencies,
      allDependenciesKey: options.allDependenciesKey,
      updateExternalImports
     })
  ]);
}