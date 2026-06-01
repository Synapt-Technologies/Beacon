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
  readonly nodes: LogicNode[];
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
  readonly left: LogicNode;
  readonly right: LogicNode;
}

export type ContainsAction = "any" | "all";

export interface SourceListContainsNode {
  readonly type: "SourceListContainsNode";
  readonly mode: ContainsAction;
  readonly sources: GlobalSourceAddress[];
  readonly targets: GlobalSourceAddress[];
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
  readonly nodes: LogicNode[];
  readonly operator: NumericSelectorAction;
}

export type NumericComputationAction = "+" | "-" | "*" | "/" | "%" | "^";

export interface NumericComputationNode {
  readonly type: "NumericComputationNode";
  readonly operator: NumericComputationAction;
  readonly left: LogicNode;
  readonly right: LogicNode;
}

//? List nodes
// Map node? Takes numeric list and applies NumericLogicNode / Node that can take a numeric input?
// Should check how to set the correct node field there.

//? TallyState nodes
export interface TallyStateMapNode {
  readonly type: "TallyStateSelectorNode";
  readonly options : { state: TallyState; condition: LogicNode }[];
}

export interface TallyStatePriorityNode {
  readonly type: "TallyStatePriorityNode";
  readonly priority: TallyState[]; // High to low priority. First matching state is output.
  readonly nodes: LogicNode[];
}



// TODO: addresses or keys?
export type ListItem = GlobalSourceAddress | string | number;


export type BooleanLogicNodes = BooleanLogicNode | BooleanValueNode | NumericComparisonNode | SourceListContainsNode;
export type NumericLogicNodes =  NumericValueNode | NumericSelectorNode | NumericComputationNode;
// export type StringLogicNode = StringListNode;
// export type ListLogicNode;
export type TallyStateLogicNodes = SimpleBusNode;
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

  export function createBooleanLogicNode(
    operator: ListPropositionOperator,
    nodes: LogicNode[] = []
  ): BooleanLogicNode {
    return {
      type: "BooleanLogicNode",
      operator,
      nodes,
    };
  }

  export function createBooleanValueNode(state: boolean = false): BooleanValueNode {
    return {
      type: "BooleanValueNode",
      state: state,
    };
  }

  export function createNumericComparisonNode(
    operator: ComparisonOperator = "==",
    left: LogicNode,
    right: LogicNode,
  ): NumericComparisonNode {
    return {
      type: "NumericComparisonNode",
      operator,
      left,
      right,
    };
  }

  export function createSourceListContainsNode(
    mode: ContainsAction = "any",
    sources: GlobalSourceAddress[] = [],
    targets: GlobalSourceAddress[] = [],
  ): SourceListContainsNode {
    return {
      type: "SourceListContainsNode",
      mode,
      sources,
      targets,
    };
  }

  export function createNumericValueNode(value: number = 0): NumericValueNode {
    return {
      type: "NumericValueNode",
      value: value,
    };
  }

  export function createNumericSelectorNode(
    nodes: LogicNode[] = [],
    operator: NumericSelectorAction = "max",
  ): NumericSelectorNode {
    return {
      type: "NumericSelectorNode",
      nodes,
      operator,
    };
  }

  export function createNumericComputationNode(
    operator: NumericComputationAction = "+",
    left: LogicNode,
    right: LogicNode,
  ): NumericComputationNode {
    return {
      type: "NumericComputationNode",
      operator,
      left,
      right,
    };
  }

  export function createTallyStateMapNode(
    options: { state: TallyState; condition: LogicNode }[] = [],
  ): TallyStateMapNode {
    return {
      type: "TallyStateSelectorNode",
      options,
    };
  }

  const DEFAULT_TALLY_STATE_ORDER: TallyState[] = Object.values(TallyState)
  .filter((v): v is TallyState => typeof v === "number")
  .sort((a, b) => b - a);

  export function createTallyStatePriorityNode(
    priority: TallyState[] = DEFAULT_TALLY_STATE_ORDER,
    nodes: LogicNode[],
  ): TallyStatePriorityNode {
    return {
      type: "TallyStatePriorityNode",
      priority,
      nodes,
    };
  }
}


// TODO: Check if the following code is better:
// type NodeProps<K extends LogicNode["type"]> = Omit<Extract<LogicNode, { type: K }>, "type">;

// const NODE_DEFAULTS: { [K in LogicNode["type"]]?: Partial<NodeProps<K>> } = {
//   OrNode:                  { nodes: [] },
//   AndNode:                 { nodes: [] },
//   XorNode:                 { nodes: [] },
//   SimpleBusNode:           { sources: [] },
//   BooleanNode:             { state: false },
//   SourceListContainsNode:  { sources: [], targets: [], mode: "any" },
// };

// export namespace LogicFactory {
//   export function create<K extends LogicNode["type"]>(
//     type: K,
//     props: Partial<NodeProps<K>> = {},
//   ): Extract<LogicNode, { type: K }> {
//     return { ...(NODE_DEFAULTS[type] ?? {}), ...props, type } as Extract<LogicNode, { type: K }>;
//   }
// }