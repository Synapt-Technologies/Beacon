
//? Source location — carried by nodes for editor/LSP diagnostics
export interface SourceLocation {
  line: number
  column: number
  length: number
}

//? Node types
// LiteralValue - Used for primitives only for now.
// TODO: Add more complex types (structs, arrays, etc.) in the future.
type LiteralValue = string | number | boolean;

// OpInputType - single node or variadic (multiple connections in the editor).
// ASTNode  = one wire, regardless of what type it produces (including lists).
// ASTNode[] = multiple wires - variadic input, only for ops with variadic: true.
export type OpInputType = ASTNode | ASTNode[]

//? AST Nodes

// Primitive value definition
export interface LiteralNode {
  kind: 'literal';
  type: string;       // registered output type name - Validated against Zod schema at analysis time.
  value: LiteralValue;
  loc?: SourceLocation;
}

// Array of ASTNodes
export interface ArrayNode {
  kind: 'array';
  items: ASTNode[];
  type: string;        // inferred at analyse time from item types
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
  name: string;       // binding name in RawProgram.bindings
  type: string;       // output type of the referenced binding
  loc?: SourceLocation;
}


// A named operation applied to named inputs: And(nodes: [s1, s2]), BusSources(busId: "...")
// inputs values are either a single ASTNode or ASTNode[] for variadic inputs.
// Variadic inputs are only valid for OpInputs with variadic: true.
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


// TODO: FilterNode, MapNode and HigherOrderNode.

/**
 * Filter a list by a condition evaluated per item.
 * itemBinding names the current item — accessible via RefNode in condition.
 *
 * Analogous to CPL's lambda/closure — creates a new scope for the body.
 * Cannot be expressed as OperationNode because the condition must be
 * evaluated per-item inside a new environment, not pre-resolved to a value.
 */
export interface FilterNode {
  kind: 'filter'
  list: ASTNode
  itemBinding: string
  condition: ASTNode  // boolean-producing, references itemBinding via RefNode
  loc?: SourceLocation
}
 
/**
 * Transform each item in a list.
 * Same scoping mechanism as FilterNode.
 */
export interface MapNode {
  kind: 'map'
  list: ASTNode
  itemBinding: string
  transform: ASTNode
  loc?: SourceLocation
}
 
/**
 * General higher-order operation — the generalisation of FilterNode/MapNode.
 * Registered ops (Filter, Map, Find, Reduce) use this node type.
 *
 * inputs   — pre-resolved before calling the evaluator (like OperationNode)
 * bindings — scoped variable names, one per argument to apply()
 * body     — evaluated in a new environment per apply() call
 *
 * The evaluator receives pre-resolved inputs and a pre-built apply() function.
 * apply() handles environment extension and body evaluation internally.
 * Evaluators never see interpreter internals.
 */
export interface HigherOrderNode {
  kind: 'higher_order'
  op: string                            // must match a registered HigherOrderEvaluatorDefinition
  inputs: Record<string, OpInputType>   // regular inputs — pre-resolved before evaluator call
  bindings: string[]                    // scoped variable names — one per apply() argument
  body: ASTNode                         // evaluated in new environment per apply() call
  loc?: SourceLocation
}
 
export type ASTNode =
  | LiteralNode
  | ArrayNode
  | InputNode
  | RefNode
  | OperationNode
  | FieldAccessNode
  | FilterNode
  | MapNode
  | HigherOrderNode
