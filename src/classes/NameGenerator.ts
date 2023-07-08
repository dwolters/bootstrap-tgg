import { type ClassMapping } from '../types/mapping'
// eslint-disable-next-line @typescript-eslint/ban-types
let uniqueNames: Object = {}

function createUniqueName (name: string, scopeName: string): string {
  if (!uniqueNames[scopeName]) { uniqueNames[scopeName] = [] }
  const scope = uniqueNames[scopeName]
  let uniqueName = name
  let count = 2
  while (scope.includes(uniqueName)) {
    uniqueName = name + count++
  }
  scope.push(uniqueName)
  return uniqueName
}

export default {
  clearAll (): void {
    uniqueNames = {}
  },

  clearScope (scopeName: string): void {
    uniqueNames[scopeName] = []
  },

  generateTGGName (sourceMetamodelName: string, targetMetamodelName: string): string {
    const name = sourceMetamodelName + 'To' + targetMetamodelName
    return createUniqueName(name, 'tgg')
  },

  generateObjectName (className: string, ruleName: string): string {
    let name = className.replace(/[^A-Z]/g, '').toLocaleLowerCase()
    if (name == '') { name = className.charAt(0).toLocaleLowerCase() }
    return createUniqueName(name, ruleName)
  },

  generatePatternName (name: string): string {
    return createUniqueName(name, 'pattern')
  },

  generateConstraintName (name: string): string {
    return createUniqueName(name, 'constraint')
  },

  generateModifierName (className: string, ruleName: string): string {
    const name = 'Existing' + className
    return createUniqueName(name, ruleName)
  },

  generateRootModifierName (className: string, ruleName: string): string {
    const name = 'Root' + className
    return createUniqueName(name, ruleName)
  },

  generateVariableName (srcVar: string, tgtVar: string, ruleName: string): string {
    return createUniqueName(srcVar, ruleName)
  },

  generateRuleNameForClassMapping (mapping: ClassMapping): string {
    const name = mapping.name || mapping.source + '2' + mapping.target
    return createUniqueName(name, 'rules')
  },

  generateRuleName (source: string, target: string, prefix = ''): string {
    const name = source + '2' + target
    return createUniqueName(name, 'rules')
  },

  generateAssociationRuleName (sourceClassName: string, sourceAssociation: string, targetClassName, targetAssocation: string): string {
    const name = sourceClassName + '_' + sourceAssociation + '2' + targetClassName + '_' + targetAssocation
    return createUniqueName(name, 'rules')
  },

  generateIndexParameterIdentifier (): string {
    return createUniqueName('_______IPID', 'identifier')
  }
}
