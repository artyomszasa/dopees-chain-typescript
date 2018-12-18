import * as t from '@babel/types';

// MINIMAL interface for TS

export interface TraversePath<T extends t.Node> {
  node: T;
  replaceWith(newNode: t.Node): void;
}

interface Visitor {
    ImportDeclaration(path: TraversePath<t.ImportDeclaration>): void;
}

export default function traverse(ast: t.Node, handler: Visitor): t.Node;