import { z } from 'zod'
import { createLanguage, type Language } from './logic.registry'


// Creates base language
export function createCoreLanguage(): Language {
  const lang = createLanguage()
 
  //? Primitive types 
  lang.registerType('boolean', z.boolean())
  lang.registerType('number', z.number())
  lang.registerType('string', z.string())
  lang.registerType('any', z.unknown())
 
  //? Logic ops
  lang.registerOp({
    name: 'And',
    inputs: [{ name: 'nodes', type: 'boolean', variadic: true }],
    output: 'boolean',
    category: 'logic',
  })
 
  lang.registerOp({
    name: 'Or',
    inputs: [{ name: 'nodes', type: 'boolean', variadic: true }],
    output: 'boolean',
    category: 'logic',
  })
 
  lang.registerOp({
    name: 'Not',
    inputs: [{ name: 'a', type: 'boolean' }],
    output: 'boolean',
    category: 'logic',
  })
 
  lang.registerOp({
    name: 'Xor',
    inputs: [{ name: 'nodes', type: 'boolean', variadic: true }],
    output: 'boolean',
    category: 'logic',
  })
 
  lang.registerOp({
    name: 'Nor',
    inputs: [{ name: 'nodes', type: 'boolean', variadic: true }],
    output: 'boolean',
    category: 'logic',
  })
 
  lang.registerOp({
    name: 'Nand',
    inputs: [{ name: 'nodes', type: 'boolean', variadic: true }],
    output: 'boolean',
    category: 'logic',
  })
 
  lang.registerOp({
    name: 'XNor',
    inputs: [{ name: 'nodes', type: 'boolean', variadic: true }],
    output: 'boolean',
    category: 'logic',
  })
 
  //? Comparison ops
  lang.registerOp({
    name: 'Equals',
    inputs: [{ name: 'a', type: 'any' }, { name: 'b', type: 'any' }],
    output: 'boolean',
    category: 'comparison',
  })
 
  lang.registerOp({
    name: 'NotEquals',
    inputs: [{ name: 'a', type: 'any' }, { name: 'b', type: 'any' }],
    output: 'boolean',
    category: 'comparison',
  })
 
  lang.registerOp({
    name: 'GreaterThan',
    inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
    output: 'boolean',
    category: 'comparison',
  })
 
  lang.registerOp({
    name: 'LessThan',
    inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
    output: 'boolean',
    category: 'comparison',
  })
 
  //? Control flow
  // Note: If evaluates both branches before choosing - no short-circuit yet.
  // For short-circuit, the evaluator needs NodeRef access (future work).
  lang.registerOp({
    name: 'If',
    inputs: [
      { name: 'condition', type: 'boolean' },
      { name: 'then', type: 'any' },
      { name: 'else', type: 'any' },
    ],
    output: 'any',
    category: 'control',
  })
 
  //? Evaluators
  lang.registerEvaluator({
    op: 'And',
    evaluate: ({ nodes }) => (nodes as boolean[]).every(Boolean),
  })
 
  lang.registerEvaluator({
    op: 'Or',
    evaluate: ({ nodes }) => (nodes as boolean[]).some(Boolean),
  })
 
  lang.registerEvaluator({
    op: 'Not',
    evaluate: ({ a }) => !Boolean(a),
  })
 
  lang.registerEvaluator({
    op: 'Xor',
    evaluate: ({ nodes }) =>
      (nodes as boolean[]).filter(Boolean).length % 2 === 1,
  })
 
  lang.registerEvaluator({
    op: 'Equals',
    evaluate: ({ a, b }) => a === b,
  })
 
  lang.registerEvaluator({
    op: 'NotEquals',
    evaluate: ({ a, b }) => a !== b,
  })
 
  lang.registerEvaluator({
    op: 'GreaterThan',
    evaluate: ({ a, b }) => (a as number) > (b as number),
  })
 
  lang.registerEvaluator({
    op: 'LessThan',
    evaluate: ({ a, b }) => (a as number) < (b as number),
  })
 
  lang.registerEvaluator({
    op: 'If',
    evaluate: ({ condition, then, else: otherwise }) =>
      Boolean(condition) ? then : otherwise,
  })
 
  return lang
}