import { type Association, type Mapping, type MappingOption, Modifier, type Property, type AttributeType, type ValueMapping, type AssociatedAttribute } from '../types/mapping'
import NameGenerator from './NameGenerator'
import '../helpers/handlebars-helper'
import { Rule } from './Rule'
import { type RuleObject } from './RuleObject'
import { TGG } from './TGG'
import parser from '../parsers/emsl-mapping'

export default class MappingProcessor {
  tgg: TGG

  constructor (mappingStr: string, sourceMetamodelStr: string, targetMetamodelStr: string) {
    this.tgg = TGG.createTGG(sourceMetamodelStr, targetMetamodelStr)

    const mapping = this.readMapping(mappingStr)

    this.processOptions(mapping.options)

    this.generateRules(mapping)

    this.tgg.generateRootVariants()

    this.tgg.applyAssociationMappings()

    this.tgg.inferCorrespondences()

    this.tgg.generateRuleVariants()

    this.tgg.createContraints()
  }

  processOptions (options: MappingOption[]): void {
    options.forEach(option => {
      switch (option.name) {
        case 'set':
          this.tgg.options.set = option.values.map(e => {
            if (!e.includes('.')) {
              throw new Error(`Value ${e} for option set does not follow the pattern Class.Assocation`)
            }
            const [sourceClass, associationName] = e.split('.')
            return { sourceClass, associationName }
          })
          return
        case 'root':
          this.tgg.options.root = option.values
          return
        case 'disableCompositionAugmentation':
          this.tgg.options.disableCompositionAugmentation = true
          return
        case 'disableLowerBoundAugmentation':
          this.tgg.options.disableLowerBoundAugmentation = true
          return
        case 'excludeRules':
        case 'includeRules':
        case 'excludeCorrespondences':
        case 'includeCorrespondences':
        case 'excludeConstraints':
        case 'includeConstraints':
          this.tgg.options[option.name] = option.values
          return
        case 'keepCompositionRules':
          this.tgg.options.keepCompositionRules = true
          return
        case 'constraints':
          this.tgg.options.constraints = option.values
      }
    })
  }

  generateCorrespondences (mapping: Mapping): void {
    mapping.classMapping.forEach(mapping => {
      const sourceClassName = mapping.source
      const targetClassName = mapping.target
      const ruleName = mapping.name = NameGenerator.generateRuleNameForClassMapping(mapping)
      const correspondenceName = mapping.correspondenceName = mapping.correspondenceName || ruleName
      if (!this.tgg.sourceMetamodel.hasClass(sourceClassName)) { throw new Error('Unknown class of source metamodel: ' + sourceClassName) }
      if (!this.tgg.targetMetamodel.hasClass(targetClassName)) { throw new Error('Unknown class of target metamodel: ' + targetClassName) }
      this.tgg.addCorrespondence(sourceClassName, targetClassName, correspondenceName)
    })
  }

  generateRules (mapping: Mapping): void {
    this.generateCorrespondences(mapping)
    mapping.classMapping.forEach(mapping => {
      const sourceClassName = mapping.source
      const targetClassName = mapping.target
      const ruleName = mapping.name
      const correspondenceName = mapping.correspondenceName

      const rule = new Rule(ruleName, this.tgg)
      const sourceCreate = rule.modifierToCreate(mapping.sourceModifier || Modifier.create, sourceClassName)
      const sourceObject = rule.createSourceObject(sourceClassName, sourceCreate, true)
      sourceObject.isOrigin = true
      const targetCreate = rule.modifierToCreate(mapping.targetModifier || Modifier.create, targetClassName)
      const targetObject = rule.createTargetObject(targetClassName, targetCreate, true)
      targetObject.isOrigin = true
      rule.addCorrespondenceObject(correspondenceName, sourceObject, targetObject, true)
      sourceObject.addPattern(mapping.sourcePattern)
      targetObject.addPattern(mapping.targetPattern)

      mapping.properties.forEach(propMapping => {
        const source = propMapping.source
        const target = propMapping.target
        this.handlePropertyMapping(rule, sourceObject, targetObject, source, target, propMapping.valueMapping)
      })
    })
  }

  private handlePropertyMapping (rule: Rule, sourceObject: RuleObject, targetObject: RuleObject,
    source: Property, target: Property, valueMapping: ValueMapping[]): void {
    if (typeof source === 'string' && typeof target === 'string') {
      this.handleAttributeMapping(rule, sourceObject, targetObject, source, target, valueMapping)
    } else if (typeof source === 'string' && typeof target === 'object' && target.type == 'associated_attribute') {
      this.handleAttributeToAssociatedAttributeMapping(rule, sourceObject, targetObject, source, target, valueMapping)
    } else if (typeof source === 'object' && source.type == 'associated_attribute' && typeof target === 'string') {
      this.handleAttributeToAssociatedAttributeMapping(rule, targetObject, sourceObject, target, source, valueMapping, true)
    } else if (typeof source === 'object' && source.type == 'associated_attribute' && typeof target === 'object' && target.type == 'associated_attribute') {
      this.handleAssociatedAttributeToAssociatedAttributeMapping(rule, sourceObject, targetObject, source, target, valueMapping)
    } else if (typeof source === 'object' && source.type == 'association' && typeof target === 'object' && target.type == 'association') {
      this.handleAssociationMapping(rule, sourceObject, targetObject, source, target)
    } else {
      throw new Error('Unknown mapping type')
    }
  }

  private handleAttributeMapping (rule: Rule, sourceObject: RuleObject, targetObject: RuleObject, source: string, target: string, valueMapping: ValueMapping[]): void {
    if (!this.tgg.sourceMetamodel.getAttribute(sourceObject.class, source)) { throw new Error(`Unknown attribute '${source}' of class '${sourceObject.class}'`) }
    if (!this.tgg.targetMetamodel.getAttribute(targetObject.class, target)) { throw new Error(`Unknown attribute '${target}' of class '${targetObject.class}'`) }

    if (valueMapping) {
      const paramID = rule.addIndexParameter(valueMapping.map(v => '_' + source + 'EQ' + v.source + '_' + target + 'EQ' + v.target))
      sourceObject.setAttributeValue(source, valueMapping.map(v => v.source) as AttributeType, paramID)
      targetObject.setAttributeValue(target, valueMapping.map(v => v.target) as AttributeType, paramID)
    } else {
      // First check if a variable for this attribute exists on source or target side
      const sourceVariable = sourceObject.getVariableNameForAttribute(source)
      const targetVariable = targetObject.getVariableNameForAttribute(target)

      if (sourceVariable && targetVariable && sourceVariable != targetVariable) {
        throw new Error(`Attributes "${source}" and "${target}" cannot be mapped. Attribute "${source}" already mapped to "${sourceVariable}" and attribute "${target}" already mapped to "${targetVariable}"`)
      }

      const variable = sourceVariable ||
        targetVariable ||
        NameGenerator.generateVariableName(source, target, rule.name)

      if (!sourceVariable) { sourceObject.setAttributeVariable(source, variable) }
      if (!targetVariable) { targetObject.setAttributeVariable(target, variable) }
    }
  }

  private handleAttributeToAssociatedAttributeMapping (rule: Rule, sourceObject: RuleObject, targetObject: RuleObject,
    source: string, associatedAttribute: AssociatedAttribute, valueMapping: ValueMapping[], reversed: boolean = false): void {
    if (reversed) {
      if (!this.tgg.targetMetamodel.getAttribute(sourceObject.class, source)) { throw new Error(`Unknown attribute '${source}' of class '${sourceObject.class}'`) }
      if (!this.tgg.sourceMetamodel.getAssociation(targetObject.class, associatedAttribute.associationName)) { throw new Error(`Unknown association '${associatedAttribute.associationName}' of class '${targetObject.class}'`) }
    } else {
      if (!this.tgg.sourceMetamodel.getAttribute(sourceObject.class, source)) { throw new Error(`Unknown attribute '${source}' of class '${sourceObject.class}'`) }
      if (!this.tgg.targetMetamodel.getAssociation(targetObject.class, associatedAttribute.associationName)) { throw new Error(`Unknown association '${associatedAttribute.associationName}' of class '${targetObject.class}'`) }
    }

    const sourceVariable = sourceObject.getVariableNameForAttribute(source)
    const variable = sourceVariable || NameGenerator.generateVariableName(source, associatedAttribute.associationName, rule.name)
    if (!sourceVariable) { sourceObject.setAttributeVariable(source, variable) }

    if (!associatedAttribute.targetClass) { associatedAttribute.targetClass = targetObject.getMetamodel().getAssociation(targetObject.class, associatedAttribute.associationName).target }

    const correspondenceName = rule.name + '_' + associatedAttribute.targetClass
    const associatedObject: RuleObject = rule.createObjectForAssociationPattern(associatedAttribute, targetObject, false, Modifier.create)
    if (reversed) {
      this.tgg.addCorrespondence(associatedObject.class, sourceObject.class, correspondenceName)
      rule.addCorrespondenceObject(correspondenceName, associatedObject, sourceObject, associatedObject.create)
    } else {
      this.tgg.addCorrespondence(sourceObject.class, associatedObject.class, correspondenceName)
      rule.addCorrespondenceObject(correspondenceName, sourceObject, associatedObject, associatedObject.create)
    }
    associatedObject.setAttributeVariable(associatedAttribute.targetAttribute, variable)
    associatedObject.inCorrespondence = true

    // TODO create should be false if both source and target of the association exist.
    // targetObject.addObjectAssociationWithObject(associatedAttribute.associationName, associatedAttribute.associationPattern, associatedObject, true);
  }

  handleAssociatedAttributeToAssociatedAttributeMapping (rule: Rule, sourceObject: RuleObject, targetObject: RuleObject, source: AssociatedAttribute, target: AssociatedAttribute, valueMapping: ValueMapping[]): void {
    if (!this.tgg.sourceMetamodel.getAssociation(sourceObject.class, source.associationName)) { throw new Error(`Unknown association '${source.associationName}' of class '${targetObject.class}'`) }
    if (!this.tgg.targetMetamodel.getAssociation(targetObject.class, target.associationName)) { throw new Error(`Unknown association '${target.associationName}' of class '${targetObject.class}'`) }

    if (!source.targetClass) { source.targetClass = sourceObject.getMetamodel().getAssociation(sourceObject.class, source.associationName).target }
    if (!target.targetClass) { target.targetClass = targetObject.getMetamodel().getAssociation(targetObject.class, target.associationName).target }

    const variable = NameGenerator.generateVariableName(source.targetAttribute, target.targetAttribute, rule.name)

    const sourceChildObject = rule.createObjectForAssociationPattern(source, sourceObject, false, Modifier.create)
    sourceChildObject.inCorrespondence = true
    sourceChildObject.setAttributeVariable(source.targetAttribute, variable)
    const targetChildObject = rule.createObjectForAssociationPattern(target, targetObject, false, Modifier.create)
    targetChildObject.inCorrespondence = true
    targetChildObject.setAttributeVariable(target.targetAttribute, variable)

    const correspondenceName = NameGenerator.generateRuleName(source.targetClass, target.targetClass, rule.name)

    this.tgg.addCorrespondence(sourceChildObject.class, targetChildObject.class, correspondenceName)
    rule.addCorrespondenceObject(correspondenceName, sourceChildObject, targetChildObject, Rule.determineAssociationCreate(sourceChildObject.create, targetChildObject.create))

    sourceObject.addObjectAssociationWithObject(source.associationName, source.associationPattern, sourceChildObject, sourceChildObject.create)
    targetObject.addObjectAssociationWithObject(target.associationName, target.associationPattern, targetChildObject, targetChildObject.create)
  }

  private handleAssociationMapping (rule: Rule, sourceObject: RuleObject, targetObject: RuleObject,
    sourceAssociation: Association, targetAssociation: Association): void {
    sourceAssociation.targetClass = this.tgg.sourceMetamodel.inferTargetClassofAssociation(sourceObject.class, sourceAssociation.associationName, sourceAssociation.targetClass)
    targetAssociation.targetClass = this.tgg.targetMetamodel.inferTargetClassofAssociation(targetObject.class, targetAssociation.associationName, targetAssociation.targetClass)
    const applicableCorrespondences = this.tgg.getApplicableCorrespondenceForSuperclass(sourceAssociation.targetClass, targetAssociation.targetClass)
    if (applicableCorrespondences.length === 0) {
      throw new Error(`Cannot find correspondences between targets "${sourceAssociation.targetClass}" and "${targetAssociation.targetClass}" of mapped associations "${sourceAssociation.associationName}" and "${targetAssociation.associationName}"`)
    }
    applicableCorrespondences.forEach(correspondence => {
      const name = NameGenerator.generateAssociationRuleName(sourceObject.class, sourceAssociation.associationName, targetObject.class, targetAssociation.associationName)
      const newRule = new Rule(name, this.tgg, true)
      const sourceParentObject = newRule.createSourceObject(sourceObject.class, false, true)
      sourceParentObject.isOrigin = true
      const sourceChildObject = newRule.createSourceObject(correspondence.sourceClass, false, true)
      if (sourceAssociation.targetPattern) {
        sourceChildObject.addPattern(sourceAssociation.targetPattern, true)
      }
      sourceParentObject.addObjectAssociationWithObject(sourceAssociation.associationName, sourceAssociation.associationPattern, sourceChildObject, true)
      const targetParentObject = newRule.createTargetObject(targetObject.class, false, true)
      targetParentObject.isOrigin = true
      const targetChildObject = newRule.createTargetObject(correspondence.targetClass, false, true)
      if (targetAssociation.targetPattern) {
        targetChildObject.addPattern(targetAssociation.targetPattern, true)
      }
      targetParentObject.addObjectAssociationWithObject(targetAssociation.associationName, targetAssociation.associationPattern, targetChildObject, true)
      newRule.addCorrespondenceObject(rule.name, sourceParentObject, targetParentObject, false)
      newRule.addCorrespondenceObject(correspondence.name, sourceChildObject, targetChildObject, false)
    })
  }

  private readMapping (mappingStr: string): Mapping {
    // Remove one line comments
    mappingStr = mappingStr.replaceAll(/\/\/.*/g, '')
    const mapping: Mapping = parser.parse(mappingStr, { grammarSource: 'Mapping' })
    return mapping
  }

  generateTGG (): TGG {
    return this.tgg
  }
}
