import { TallyState } from "./CommonTypes";
import type { ProducerId } from "./ProducerTypes";
import type { BusGroupStateMap, GlobalSourceAddress } from "./SourceTypes";

export interface TallyContext {
  newBus: BusGroupStateMap;
  oldBus: BusGroupStateMap;
  disconnectedProducers: Set<ProducerId>;
  disconnectedState: TallyState;
}

// TODO: Add Desugared Nodes?
// TODO: Add a TallyDevice type that is the desugared/interpetted version of the tallydevice, that includes desugared logic nodes and for example a relevant sources (per bus) for quicker logic.

//? Producing Nodes
// TODO: Add a type with this? Or a field?
// Default. Uses the bus map.
export interface SimpleBusNode { // TallyState Output
  readonly type: "SimpleBusNode";
  readonly sources: GlobalSourceAddress[];
}


// ? Boolean nodes
export type ListPropositionOperator = "or" | "and" | "xor" | "nor" | "nand" | "xnor";

export interface BooleanLogicNode {
  readonly type: "BooleanLogicNode";
  readonly operator: ListPropositionOperator;
  readonly nodes: BooleanLogicNodes[];
}


// User toggleable node for manually setting a state.
export interface BooleanValueNode {
  readonly type: "BooleanValueNode";
  readonly state: boolean;
}

export type ComparisonOperator = ">" | "<" | ">=" | "<=" | "==" | "!=";

export interface NumericComparisonNode {
  readonly type: "NumericComparisonNode";
  readonly operator: ComparisonOperator;
  readonly left: NumericLogicNodes | null;
  readonly right: NumericLogicNodes | null;
}

export type ContainsAction = "any" | "all";

export interface ListContainsNode {
  readonly type: "ListContainsNode";
  readonly mode: ContainsAction;
  readonly haystack: ListItem[];
  readonly needles: ListItem[];
}

//? Numeric nodes
// User setable number node for manually setting a state.
export interface NumericValueNode {
  readonly type: "NumericValueNode";
  readonly value: number;
}

export type NumericSelectorAction = "max" | "min" | "avg" | "sum";

export interface NumericSelectorNode {
  readonly type: "NumericSelectorNode";
  readonly operator: NumericSelectorAction;
  readonly nodes: NumericLogicNodes[];
}

export type NumericComputationAction = "+" | "-" | "*" | "/" | "%" | "^";

export interface NumericComputationNode {
  readonly type: "NumericComputationNode";
  readonly operator: NumericComputationAction;
  readonly left: NumericLogicNodes | null;
  readonly right: NumericLogicNodes | null;
}

//? List nodes
// Map node? Takes numeric list and applies NumericLogicNode / Node that can take a numeric input?
// Should check how to set the correct node field there.

//? TallyState nodes
export interface TallyStateMapNode {
  readonly type: "TallyStateMapNode";
  readonly options : { state: TallyState; condition: BooleanLogicNodes }[];
}

export interface TallyStatePriorityNode {
  readonly type: "TallyStatePriorityNode";
  readonly priority: TallyState[]; // High to low priority. First matching state is output.
  readonly nodes: TallyStateLogicNodes[];
}


// TODO
//? Reference nodes
// TODO: Add interpreted node type, and use it in the TallyContext->Environment. Also add a thunk type for lazy evaluation?
// export interface SetReferenceNode {
//   readonly type: "SetBoxNode";
//   readonly id: string;
//   readonly node: LogicNode;
// }

// export interface GetReferenceNode {
//   readonly type: "GetBoxNode";
//   readonly id: string;
// }


// TODO: addresses or keys?
export type ListItem = GlobalSourceAddress | string | number;


export type BooleanLogicNodes = BooleanLogicNode | BooleanValueNode | NumericComparisonNode | ListContainsNode;
export type NumericLogicNodes =  NumericValueNode | NumericSelectorNode | NumericComputationNode;
// export type StringLogicNode = StringListNode;
// export type ListLogicNode;
export type TallyStateLogicNodes = SimpleBusNode | TallyStateMapNode | TallyStatePriorityNode;
export type LogicNode = TallyStateLogicNodes | BooleanLogicNodes | NumericLogicNodes;

// TODO: Generic constructor create function?
// TODO: Convert all helper abstract class to namespaces with functions.
export namespace LogicFactory {
  export function createSimpleBusNode(
    sources: GlobalSourceAddress[] = [],
  ): SimpleBusNode {
    return {
      type: "SimpleBusNode",
      sources: sources,
    };
  }

  const DEFAULT_TALLY_STATE_ORDER: TallyState[] = Object.values(TallyState)
  .filter((v): v is TallyState => typeof v === "number")
  .sort((a, b) => b - a);

  type NodeProps<K extends LogicNode["type"]> = Omit<Extract<LogicNode, { type: K }>, "type">;
  
  const NODE_DEFAULTS: { [K in LogicNode["type"]]: NodeProps<K> } = {
    SimpleBusNode:           { sources: [] },
    BooleanLogicNode:        { operator: "and", nodes: [] },
    BooleanValueNode:        { state: false },
    NumericComparisonNode:   { operator: "==", left: null, right: null },
    ListContainsNode:        { mode: "any", haystack: [], needles: [] },
    NumericValueNode:        { value: 0 },
    NumericSelectorNode:     { operator: "max", nodes: [] },
    NumericComputationNode:  { operator: "+", left: null, right: null },
    TallyStateMapNode:       { options: [] },
    TallyStatePriorityNode:  { priority: DEFAULT_TALLY_STATE_ORDER, nodes: [] },
  };

  export function create<K extends LogicNode["type"]>(
    type: K,
    props: Partial<NodeProps<K>> = {},
  ): Extract<LogicNode, { type: K }> {
    return { ...structuredClone(NODE_DEFAULTS[type]), ...props, type } as unknown as Extract<LogicNode, { type: K }>;
  }
}
