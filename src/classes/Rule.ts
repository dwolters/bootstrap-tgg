import { type Create, Modifier, type CorrespondenceObject, type RuleParameter, type Association, type AssociatedAttribute } from '../types/mapping'
import { RuleObject } from './RuleObject'
import { type TGG } from './TGG'
import NameGenerator from './NameGenerator'
import { type Metamodel } from './Metamodel'

interface Match {
  parentObject: RuleObject
  parentCorrespondence?: CorrespondenceObject
  childObject: RuleObject
  childCorrespondence?: CorrespondenceObject
}

export class Rule {
  clone (): Rule {
    const rule = new Rule(this.name, this.tgg, this.isAssociationMapping)
    rule.parameters = this.parameters
    rule.sourceObjects = this.sourceObjects.map(obj => obj.clone())
    rule.targetObjects = this.targetObjects.map(obj => obj.clone())
    rule.correspondences = this.correspondences.map(obj => structuredClone(obj))
    return rule
  }

  name: string
  sourceObjects: RuleObject[]
  targetObjects: RuleObject[]
  correspondences: CorrespondenceObject[]
  parameters: RuleParameter[]
  tgg: TGG
  isAssociationMapping?: boolean

  constructor (
    name: string,
    tgg: TGG,
    isAssociationMapping: boolean = false
  ) {
    this.name = name
    this.tgg = tgg
    this.tgg.addRule(this)
    this.parameters = []
    this.isAssociationMapping = isAssociationMapping
    this.sourceObjects = []
    this.targetObjects = []
    this.correspondences = []
  }

  private addSourceObject (object: RuleObject): void {
    if (object.isParent) { this.sourceObjects.unshift(object) } else { this.sourceObjects.push(object) }
  }

  private addTargetObject (object: RuleObject): void {
    if (object.isParent) { this.targetObjects.unshift(object) } else { this.targetObjects.push(object) }
  }

  addCorrespondenceObject (type: string, sourceObject: RuleObject, targetObject: RuleObject, create: Create, prepend: boolean = false): void {
    const correspondenceObject: CorrespondenceObject = {
      type,
      sourceObjectName: sourceObject.name,
      targetObjectName: targetObject.name,
      create
    }
    if (prepend) { this.correspondences.unshift(correspondenceObject) } else { this.correspondences.push(correspondenceObject) }
  }

  addBooleanParameter (name: string): void {
    this.parameters.push({ name, type: 'boolean' })
  }

  addIndexParameter (names: any[]): string {
    const name = NameGenerator.generateIndexParameterIdentifier()
    this.parameters.push({ name, names, type: 'index' })
    return name
  }

  getCorrespondence (sourceObject: RuleObject, targetObject: RuleObject): CorrespondenceObject | undefined {
    return this.correspondences.find(obj => obj.sourceObjectName == sourceObject.name && obj.targetObjectName == targetObject.name)
  }

  getCorrespondencesForObject (objectName: string): CorrespondenceObject[] {
    return this.correspondences.filter(obj => obj.sourceObjectName == objectName || obj.targetObjectName == objectName)
  }

  removeHiddenObjects (): void {
    this.correspondences = this.correspondences.filter(cor =>
      !this.sourceObjects.find(o => o.name == cor.sourceObjectName).hide &&
      !this.targetObjects.find(o => o.name == cor.targetObjectName).hide)
    this.sourceObjects = this.sourceObjects.filter(obj => !obj.hide)
    this.targetObjects = this.targetObjects.filter(obj => !obj.hide)
  }

  findSourceObjects (
    className: string,
    callback: (object: RuleObject) => boolean
  ): RuleObject[] {
    return this.sourceObjects.filter(
      (obj) => obj.class === className && callback(obj)
    )
  }

  findTargetObjects (
    className: string,
    callback: (object: RuleObject) => boolean
  ): RuleObject[] {
    return this.targetObjects.filter(
      (obj) => obj.class === className && callback(obj)
    )
  }

  findSourceObjectByAssociationName (
    associationName: string
  ): RuleObject | undefined {
    return this.sourceObjects.find((obj) =>
      obj.associatedObjects.some((ref) => ref.associationName === associationName)
    )
  }

  findTargetObjectByAssociationName (
    associationName: string
  ): RuleObject | undefined {
    return this.targetObjects.find((obj) =>
      obj.associatedObjects.some((ref) => ref.associationName === associationName)
    )
  }

  createSourceObject (objectClass: string, create: Create, inCorrespondence: boolean, isParent: boolean = false): RuleObject {
    const object = new RuleObject(objectClass, this, create, inCorrespondence, isParent, true)
    this.addSourceObject(object)
    return object
  }

  createTargetObject (objectClass: string, create: Create, inCorrespondence: boolean, isParent: boolean = false): RuleObject {
    const object = new RuleObject(objectClass, this, create, inCorrespondence, isParent, false)
    this.addTargetObject(object)
    return object
  }

  createObjectForAssociationPattern (associationPattern: Association | AssociatedAttribute, originObject: RuleObject, forceNewObject: boolean = false, defaultModifier: Modifier = Modifier.exist): RuleObject {
    const targetModifier = associationPattern.targetModifier || defaultModifier // TODO add modifier to rule is any
    const associatedObject = this.createObjectForPattern(associationPattern.targetClass, targetModifier, forceNewObject, originObject)
    const create = Rule.determineAssociationCreate(originObject.create, associatedObject?.create)
    originObject.addObjectAssociationWithObject(associationPattern.associationName, associationPattern.associationPattern, associatedObject, create)
    associatedObject.addPattern(associationPattern.targetPattern)
    return associatedObject
  }

  addParentPatternToParentObject (childObject: RuleObject, parentAssociationPattern: Association): void {
    if (childObject.associatedParentObjects.find(ref => ref.associationName == parentAssociationPattern.associationName && ref.objectClass == parentAssociationPattern.targetClass)) { return }
    const mm = childObject.getMetamodel()
    const parentClassName = parentAssociationPattern.targetClass
    const parentModifier = parentAssociationPattern.targetModifier || Modifier.exist // TODO add modifier to rule is any
    const parentObject = this.createObjectForPattern(parentClassName, parentModifier, false, childObject, true)
    if (!parentObject) { return }
    const create = Rule.determineAssociationCreate(parentObject.create, childObject.create)
    parentObject.addObjectAssociationWithObject(parentAssociationPattern.associationName, parentAssociationPattern.associationPattern, childObject, create)
    parentObject.addPattern(parentAssociationPattern.targetPattern)

    if (mm.isSameOrSubClass(parentClassName, childObject.class) && parentObject.getMetamodel().getAssociation(parentClassName, parentAssociationPattern.associationName)?.type == 'composition') {
      const hide = NameGenerator.generateRootModifierName(parentClassName, this.name)
      this.addBooleanParameter(hide)
      parentObject.hide = hide
    }
  }

  private createObjectForPattern (className: string, objectModifier: Modifier, forceNewObject: boolean, sourceObject: RuleObject, onlyParent: boolean = false): RuleObject {
    const objects = sourceObject.isSource ? this.sourceObjects : this.targetObjects
    let associatedObject: RuleObject
    if (!forceNewObject) {
      if (onlyParent) {
        associatedObject = objects.find(obj => (obj.isParent || (obj.isOrigin && !sourceObject.isOrigin)) && obj.class == className)
      } else {
        associatedObject = objects.find(obj => obj.name != sourceObject.name && obj.class == className)
      }
      // Ignore if both objects are the same since it would end up in the same patterns
      if (associatedObject?.name == sourceObject.name) { return }
    }

    if (associatedObject) {
      const create = associatedObject.create
      if ((objectModifier == Modifier.exist && create !== false) || (objectModifier == Modifier.create && create !== true) || (objectModifier == Modifier.any && typeof create !== 'string')) {
        console.warn('Found a suitable object for association but target modifier is incompatible.')
      }
    } else {
      const create = this.modifierToCreate(objectModifier, className)

      if (sourceObject.isSource) { associatedObject = this.createSourceObject(className, create, false, true) } else { associatedObject = this.createTargetObject(className, create, false, true) }
    }
    return associatedObject
  }

  static determineAssociationCreate (sourceCreate: Create, targetCreate: Create): Create {
    if (typeof sourceCreate === 'boolean' && typeof targetCreate === 'boolean') {
      return sourceCreate || targetCreate
    }
    if (typeof targetCreate === 'boolean') {
      if (targetCreate) { return true }
      return sourceCreate
    }
    if (typeof sourceCreate === 'boolean') {
      if (sourceCreate) { return true }
      return targetCreate
    }
    if (typeof sourceCreate === 'string') { sourceCreate = [sourceCreate] }
    if (typeof targetCreate === 'string') { targetCreate = [targetCreate] }
    return sourceCreate.concat(targetCreate)
  }

  modifierToCreate (modifier: Modifier, className: string): Create {
    if (modifier == Modifier.create) { return true } else if (modifier == Modifier.exist) {
      return false
    }
    const create = NameGenerator.generateModifierName(className, this.name)
    this.addBooleanParameter(create)
    return create
  }

  getSourceMetamodel (): Metamodel {
    return this.tgg.sourceMetamodel
  }

  getTargetMetamodel (): Metamodel {
    return this.tgg.targetMetamodel
  }

  generateRuleVariants (): Rule[] {
    const rules: Rule[] = []
    const valueCombinations = this.generateParameterValueCombinations()
    valueCombinations.forEach(combination => {
      rules.push(this.cloneRuleAndSetParameterValues(combination))
    })
    return rules
  }

  private applyAssociationMappingToObject (parentCorrespondence: CorrespondenceObject, targetParentClassName: string, sourceParentObject: any, parentCorrespondenceName: string, reversed: boolean = false): RuleObject {
    let targetParentObject: RuleObject
    let objects: RuleObject[]
    let objectName: string
    // eslint-disable-next-line @typescript-eslint/ban-types
    let createObject: Function
    // eslint-disable-next-line @typescript-eslint/ban-types
    let createCorrespondence: Function
    if (reversed) {
      objects = this.sourceObjects
      objectName = parentCorrespondence?.sourceObjectName
      createObject = this.createSourceObject
      createCorrespondence = (parentCorrespondenceName: string, sourceParentObject: RuleObject, targetParentObject: RuleObject, create) => { this.addCorrespondenceObject(parentCorrespondenceName, targetParentObject, sourceParentObject, create) }
    } else {
      objects = this.targetObjects
      objectName = parentCorrespondence?.targetObjectName
      createObject = this.createTargetObject
      createCorrespondence = this.addCorrespondenceObject
    }
    if (parentCorrespondence) {
      targetParentObject = objects.find(object => object.name == objectName)
    } else {
      targetParentObject = objects.find(object => object.class == targetParentClassName && !object.inCorrespondence)
      if (!targetParentObject) {
        targetParentObject = createObject.call(this, targetParentClassName, sourceParentObject.create, true, sourceParentObject.isParent)
        targetParentObject.addPattern(null)
        console.log('Created target parent object: ' + targetParentObject.name + ' for rule: ' + this.name)
      }
      createCorrespondence.call(this, parentCorrespondenceName, sourceParentObject, targetParentObject, sourceParentObject.create)
      sourceParentObject.inCorrespondence = true
      targetParentObject.inCorrespondence = true
      console.log('Created correspondence: ' + parentCorrespondenceName + ' for objects ' + sourceParentObject.name + ' and ' + targetParentObject.name + ' in rule: ' + this.name)
    }
    return targetParentObject
  }

  applyAssociationMapping (match: Match, targetParentClassName: string, parentCorrespondenceName: string, targetChildClassName: string, childCorrespondenceName: string, targetAssociationName: string, reversed: boolean = false): void {
    const { parentObject: sourceParentObject, parentCorrespondence, childObject: sourceChildObject, childCorrespondence } = match
    const targetParentObject = this.applyAssociationMappingToObject(parentCorrespondence, targetParentClassName, sourceParentObject, parentCorrespondenceName, reversed)
    const targetChildObject = this.applyAssociationMappingToObject(childCorrespondence, targetChildClassName, sourceChildObject, childCorrespondenceName, reversed)
    if (!targetParentObject.associatedObjects.some(association => association.associationName === targetAssociationName && association.objectName === targetChildObject.name)) {
      targetParentObject.addObjectAssociationWithObject(targetAssociationName, undefined, targetChildObject, sourceChildObject.create)
    }
  }

  matchAssociationMapping (objects: RuleObject[], parentClassName: string, childClassName: string, associationName: string, parentCorrespondenceName: string, childCorrespondenceName, mm: Metamodel): Match {
    const parentObject = objects.find(object => mm.isSameOrSubClass(object.class, parentClassName))
    if (!parentObject) { return }
    const association = parentObject.associatedObjects.find(assoc => assoc.associationName === associationName)
    if (!association) { return }
    const childObject = objects.find(object => mm.isSameOrSubClass(object.class, childClassName) && object.name === association.objectName)
    if (!childObject) { return }
    const parentCorrespondences = parentObject.rule.getCorrespondencesForObject(parentObject.name)
    if (parentObject.inCorrespondence && !parentCorrespondences.some(correspondence => correspondence.type === parentCorrespondenceName)) { return }
    const childCorrespondences = childObject.rule.getCorrespondencesForObject(childObject.name)
    if (childObject.inCorrespondence && !childCorrespondences.some(correspondence => correspondence.type === childCorrespondenceName)) { return }
    const parentCorrespondence = parentCorrespondences.find(correspondence => correspondence.type === parentCorrespondenceName)
    const childCorrespondence = childCorrespondences.find(correspondence => correspondence.type === childCorrespondenceName)
    return { parentObject, parentCorrespondence, childObject, childCorrespondence }
  }

  private generateParameterValueCombinations (): Array<Array<number | boolean>> {
    const valueCombinations: Array<Array<number | boolean>> = [[]]

    for (const ruleParameter of this.parameters) {
      if (ruleParameter.type === 'boolean') {
        const newCombinations: Array<Array<number | boolean>> = []
        for (const combination of valueCombinations) {
          newCombinations.push([...combination, true])
          newCombinations.push([...combination, false])
        }
        valueCombinations.splice(0, valueCombinations.length, ...newCombinations)
      } else if (ruleParameter.type === 'index') {
        const newCombinations: Array<Array<number | boolean>> = []
        for (const combination of valueCombinations) {
          for (let i = 0; i < ruleParameter.names.length; i++) {
            newCombinations.push([...combination, i])
          }
        }
        valueCombinations.splice(0, valueCombinations.length, ...newCombinations)
      }
    }

    return valueCombinations
  }

  private cloneRuleAndSetParameterValues (combination: Array<number | boolean>): Rule {
    const clonedRule = this.clone()
    clonedRule.replaceParameters(combination)
    this.parameters.forEach((parameter, index) => {
      if (parameter.type == 'boolean' && !combination[index]) { clonedRule.name += parameter.name } else if (parameter.type == 'index') {
        clonedRule.name += parameter.names[combination[index] as number]
      }
    })
    clonedRule.removeHiddenObjects()
    return clonedRule
  }

  private replaceParameters (combination: Array<number | boolean>): void {
    this.replaceParameterInObjects(this.sourceObjects, combination)
    this.replaceParameterInObjects(this.targetObjects, combination)
    this.correspondences.forEach(correspondence => {
      this.replaceCreate(correspondence, combination)
    })
  }

  private replaceParameterInObjects (objects: RuleObject[], combination: Array<number | boolean>): void {
    objects.forEach(obj => {
      this.replaceCreate(obj, combination)
      this.replaceHide(obj, combination)
      obj.attributes.forEach(attribute => {
        if (attribute.type == 'attribute_value') {
          const parameterIndex = this.parameters.findIndex(p => p.type == 'index' && p.name == attribute.parameter)
          if (parameterIndex >= 0) {
            attribute.value = attribute.value[combination[parameterIndex] as number]
          }
        }
      })
      obj.associatedObjects.forEach(association => {
        this.replaceCreate(association, combination)
      })
    })
  }

  private replaceHide (obj: any, combination: Array<number | boolean>): void {
    if (obj.hide && typeof obj.hide === 'string') {
      const i = this.parameters.findIndex(p => p.type == 'boolean' && p.name == obj.hide)
      if (i >= 0) { obj.hide = !combination[i] }
    }
  }

  private replaceCreate (obj: any, combination: Array<number | boolean>): void {
    if (typeof obj.create === 'string') {
      const i = this.parameters.findIndex(p => p.type == 'boolean' && p.name == obj.create)
      if (i >= 0) { obj.create = combination[i] }
    } else if (Array.isArray(obj.create)) {
      let create = false
      obj.create.forEach(flag => {
        const i = this.parameters.findIndex(p => p.type == 'boolean' && p.name == flag)
        if (i < 0) { throw new Error('Unknown flag: ' + flag) }
        create = create || combination[i] as boolean
      })
      obj.create = create
    }
  }
}
