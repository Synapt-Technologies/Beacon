import { type ASTNode } from './logic.nodes'
import { type LanguageDescriptor } from './logic.registry'

//? Raw EXT Program - Parser output without validation.
export interface RawProgram {
  bindings: Map<string, ASTNode>
  outputs: Map<string, ASTNode>
}

// ? Core C Program - output of analyse, input to interpreter.
export interface CoreProgram {
  /** All named bindings: Set x = ... */
  bindings: Map<string, ASTNode>
 
  /** Named program outputs: return tally: s1 */
  outputs: Map<string, ASTNode>
 
  /** Bindings reachable from any output - computed at parse time
   * Used to skip unused bindings during eval.
   */
  usedBindings: Set<string>
 
  /**
   * Topological sort of usedBindings.
   * interp walks this in order — dependencies always before dependents.
   * Computed at analyse time. Cycles produce an AnalysisError.
   */
  evalOrder: string[]
 
  /**
   * Forward dependency map - used for dirty propagation during interp.
   * name -> bindings that directly depend on it.
   * Input node names are valid keys.
   */
  dependents: Map<string, Set<string>>
 
  /**
   * Per-output contributing inputs
   * outputName -> Set of input node names that transitively contribute to it.
   * e.g. 'tally' → Set(['sourceBusNew', 'sourceBusOld'])
   */
  // TODO: Needed?
  outputDependencies: Map<string, Set<string>>
}

//? Compure ouput dependencies - used during analysis.
export function computeOutputDependencies(
  raw: RawProgram,
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  for (const [outputName, outputNode] of raw.outputs) {
    const inputs = new Set<string>()
    collectContributingInputs(outputNode, raw.bindings, inputs, new Set())
    result.set(outputName, inputs)
  }
  return result
}

function collectContributingInputs(
  node: ASTNode,
  bindings: Map<string, ASTNode>,
  inputs: Set<string>,
  visited: Set<string>,
): void {
  switch (node.kind) {
    case 'literal':
      return  // no inputs
 
    case 'array':
      node.items.forEach(n => collectContributingInputs(n, bindings, inputs, visited))
      return
 
    case 'input':
      inputs.add(node.name)
      return
 
    case 'ref': {
      if (visited.has(node.name)) return  // cycle guard (caught by analyser but safe)
      visited.add(node.name)
      const binding = bindings.get(node.name)
      if (binding) collectContributingInputs(binding, bindings, inputs, visited)
      return
    }
 
    case 'field':
      collectContributingInputs(node.source, bindings, inputs, visited)
      return
 
    case 'operation':
      for (const input of Object.values(node.inputs)) {
        if (Array.isArray(input)) {
          input.forEach(n => collectContributingInputs(n, bindings, inputs, visited))
        } else {
          collectContributingInputs(input, bindings, inputs, visited)
        }
      }
      return
 
    //TODO:
    // case 'higher_order':
    //   for (const input of Object.values(node.inputs)) {
    //     if (Array.isArray(input)) {
    //       input.forEach(n => collectContributingInputs(n, bindings, inputs, visited))
    //     } else {
    //       collectContributingInputs(input, bindings, inputs, visited)
    //     }
    //   }
    //   collectContributingInputs(node.body, bindings, inputs, visited)
    //   return
 
    // case 'filter':
    //   collectContributingInputs(node.list, bindings, inputs, visited)
    //   collectContributingInputs(node.condition, bindings, inputs, visited)
    //   return
 
    // case 'map':
    //   collectContributingInputs(node.list, bindings, inputs, visited)
    //   collectContributingInputs(node.transform, bindings, inputs, visited)
    //   return
  }
}

//? EvalState - persistent across events, one instance per program
 
export interface EvalState {
  /**
   * Resolved values for both bindings and input nodes.
   * Maps names to values.
   * Persists between events - clean nodes retain their values here.
   */
  environment: Map<string, unknown>
 
  /** Bindings needing recomputation on next interpretProgram call */
  dirty: Set<string>
}

//? Parse and Analysis Result
export type ParseWarningKind =
  | 'unknown_output'       // return foo: x - 'foo' not registered → warning, dropped
  | 'output_type_mismatch' // return tally: s1 but s1 is not TallyState → warning, dropped
  | 'unused_binding'       // Set x = ... but x never referenced → warning, kept
  | 'missing_required_output' // registered required output not returned → warning
 
export type AnalysisErrorKind =
  | 'unknown_op'           // Op not registered → hard error
  | 'unknown_input'        // Input node not registered → hard error
  | 'unknown_type'         // Type reference not registered → hard error
  | 'cycle'                // Cycle in DAG → hard error


export interface ParseWarning {
  kind: ParseWarningKind
  name: string
  message: string
  loc?: { line: number; column: number }
}
 
export interface AnalysisError {
  kind: AnalysisErrorKind
  name: string
  message: string
  loc?: { line: number; column: number }
}
 
export interface ParseSuccess {
  ok: true
  program: RawProgram
  warnings: ParseWarning[]
}
 
export interface ParseFailure {
  ok: false
  errors: ParseWarning[]  // syntax-level errors
  warnings: ParseWarning[]
}
 
export type ParseResult = ParseSuccess | ParseFailure
 
export interface AnalysisSuccess {
  ok: true
  program: CoreProgram
  warnings: ParseWarning[]
}
 
export interface AnalysisFailure {
  ok: false
  errors: AnalysisError[]
  warnings: ParseWarning[]
}
 
export type AnalysisResult = AnalysisSuccess | AnalysisFailure



//? Evalstate Management
// State persisted accross input events. Should map which nodes depend on which inputs differently. TODO
export interface EvalState {
  /** Resolved values for both bindings and input nodes */
  cache: Map<string, unknown>
 
  /** Bindings that need recomputation on next eval */
  dirty: Set<string>
}

export function createEvalState(): EvalState {
  return { cache: new Map(), dirty: new Set() }
}
 
/** Mark all usedBindings dirty - call once after createEvalState */
export function initializeProgram(
  program: ParsedProgram,
  state: EvalState,
): void {
  for (const name of program.usedBindings) {
    state.dirty.add(name)
  }
}
 
/**
 * Update a context input and propagate dirty forward through the DAG.
 * Beacon calls this when ATEM state changes.
 */
export function updateInput(
  name: string,
  value: unknown,
  state: EvalState,
  program: ParsedProgram,
): void {
  state.cache.set(name, value)
  markDirty(name, state, program)
}
 
export function markDirty(
  name: string,
  state: EvalState,
  program: ParsedProgram,
): void {
  if (state.dirty.has(name)) return  // already dirty - stop propagation
  state.dirty.add(name)
  for (const dep of program.dependents.get(name) ?? []) {
    markDirty(dep, state, program)
  }
}


//? Evaluation
/**
 * Evaluate all dirty bindings in topological order, return named output values.
 * Clean nodes are skipped - their cached values are used directly.
 */
export function evaluateProgram(
  program: ParsedProgram,
  state: EvalState,
  descriptor: LanguageDescriptor,
  hostContext?: unknown,
): Map<string, unknown> {
  for (const name of program.evalOrder) {
    if (!state.dirty.has(name)) continue
    const node = program.bindings.get(name)!
    state.cache.set(name, evaluateNode(node, state, descriptor, hostContext))
    state.dirty.delete(name)
  }
 
  const results = new Map<string, unknown>()
  for (const [outputName, node] of program.outputs) {
    results.set(outputName, evaluateNode(node, state, descriptor, hostContext))
  }
  return results
}

/**
 * Create a derived EvalState with an extra binding for filter/map item scope.
 * Does not mutate the parent state.
 */
function withBinding(state: EvalState, name: string, value: unknown): EvalState {
  const innerCache = new Map(state.cache)
  innerCache.set(name, value)
  return { cache: innerCache, dirty: state.dirty }
}
 
export function evaluateNode(
  node: ASTNode,
  state: EvalState,
  descriptor: LanguageDescriptor,
  hostContext?: unknown,
): unknown {
  switch (node.kind) {
 
    case 'literal':
      return node.value
 
    case 'array':
      return node.items.map(item => evaluateNode(item, state, descriptor, hostContext))
 
    case 'input':
      return state.cache.get(node.name)
 
    case 'ref':
      return state.cache.get(node.name)
 
    case 'field': {
      const src = evaluateNode(node.source, state, descriptor, hostContext) as Record<string, unknown>
      return src[node.field]
    }
 
    // case 'filter': {
    //   const list = evaluateNode(node.list, state, descriptor, hostContext) as unknown[]
    //   return list.filter(item => {
    //     const inner = withBinding(state, node.itemBinding, item)
    //     return Boolean(evaluateNode(node.condition, inner, descriptor, hostContext))
    //   })
    // }
 
    // case 'map': {
    //   const list = evaluateNode(node.list, state, descriptor, hostContext) as unknown[]
    //   return list.map(item => {
    //     const inner = withBinding(state, node.itemBinding, item)
    //     return evaluateNode(node.transform, inner, descriptor, hostContext)
    //   })
    // }
 
    case 'operation': {
      const evaluator = descriptor.evaluators.get(node.op)
      if (!evaluator) throw new Error(`No evaluator registered for op: ${node.op}`)
 
      const resolved: Record<string, unknown> = {}
      for (const [key, input] of Object.entries(node.inputs)) {
        resolved[key] = Array.isArray(input)
          ? input.map(n => evaluateNode(n, state, descriptor, hostContext))
          : evaluateNode(input, state, descriptor, hostContext)
      }
 
      return evaluator.evaluate(resolved, hostContext)
    }
  }
}
 
