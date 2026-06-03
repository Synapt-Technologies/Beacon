
// TODO: Used for editor editor/LSP
export interface SourceLocation {
  line: number;
  column: number;
  length: number;
}


//? Types
// Only primitives for now.
// TODO: Check if this is the correct place to add more complex types (structs, arrays, etc) in the future. A LiteralNode that can define struct-like output might be nice.
type LiteralValue = string | number | boolean;

// OpInputType - single node or variadic (multiple connections in the editor).
// ASTNode  = one wire, regardless of what type it produces (including lists).
// ASTNode[] = multiple wires - variadic input, only for ops with variadic: true.
export type OpInputType = ASTNode | ASTNode[]

//? AST Nodes
// Primitive value
export interface LiteralNode {
  kind: 'literal';
  type: string;       // registered output type name - Validated against Zod schema at parse.
  value: LiteralValue;
  loc?: SourceLocation;
}

// Array of ASTNodes
export interface ArrayNode {
  kind: 'array';
  items: ASTNode[];
  type: string;
  loc?: SourceLocation;
}

// A named value loaded from context before eval: sourceBusNew, fallbackState
export interface InputNode {
  kind: 'input';
  name: string;       // must match a registered InputDefinition
  type: string;
  loc?: SourceLocation;
}

// A reference to a named binding: Set x = ...; use x elsewhere
export interface RefNode {
  kind: 'ref';
  name: string;       // binding name
  type: string;       // output type of the referenced binding
  loc?: SourceLocation;
}


// A named operation applied to named inputs: And(nodes: [s1, s2]), BusSources(busId: "...")
// inputs values are either a single ASTNode or ASTNode[] for variadic inputs.
export interface OperationNode {
  kind: 'operation';
  op: string;                           // must match a registered OpDefinition
  inputs: Record<string, OpInputType>;  // keyed by input name from OpDefinition
  output: string;                       // type name - resolved at parse time
  loc?: SourceLocation;
}

// Field access on a struct-typed node: bus.program
// Used for ops that return a struct type.
export interface FieldAccessNode {
  kind: 'field';
  source: ASTNode;
  field: string;
  type: string;  // resolved at parse time from the struct type definition
  loc?: SourceLocation;
}



export type ASTNode =
  | LiteralNode
  | ArrayNode
  | RefNode
  | InputNode
  | OperationNode
  | FieldAccessNode

