import { type AttributeAssignment, type AssociatedObject, type Create, type Pattern, type Association, Modifier, type AttributeType } from '../types/mapping'
import { type Rule } from './Rule'
import NameGenerator from './NameGenerator'
import type { Metamodel } from './Metamodel'

export class RuleObject {
  name: string
  class: string
  attributes: AttributeAssignment[]
  associatedObjects: AssociatedObject[]
  associatedParentObjects: AssociatedObject[]
  inCorrespondence: boolean
  create: Create
  hide?: string
  isParent: boolean
  isOrigin: boolean
  isSource: boolean
  rule: Rule

  constructor (objectClass: string, rule: Rule, create: Create, inCorrespondence: boolean, isParent: boolean, isSource: boolean) {
    this.name = NameGenerator.generateObjectName(objectClass, rule.name)
    this.class = objectClass
    this.attributes = []
    this.associatedObjects = []
    this.associatedParentObjects = []
    this.inCorrespondence = inCorrespondence
    this.create = create
    this.isParent = isParent
    this.isOrigin = false
    this.rule = rule
    this.isSource = isSource
  }

  addAttribute (attribute: AttributeAssignment): void {
    if (!this.attributes.some(a => a.name === attribute.name)) {
      this.attributes.push(attribute)
    }
  }

  addAssociatedObject (associatedObject: AssociatedObject): void {
    if (!this.hasAssociatedObject(associatedObject.associationName, associatedObject.objectName)) {
      this.associatedObjects.push(associatedObject)
    }
  }

  addAssociatedParentObject (associatedObject: AssociatedObject): void {
    if (!this.hasAssociatedParentObject(associatedObject.associationName)) {
      this.associatedParentObjects.push(associatedObject)
    }
  }

  hasAssociatedObject (associationName: string, objectName: string): boolean {
    if (!this.getMetamodel().getAssociation(this.class, associationName)) { throw new Error(`Unknown association "${associationName}" in class "${this.class}"`) }
    return this.associatedObjects.some(r => r.associationName === associationName && r.objectName === objectName)
  }

  hasAssociatedParentObject (associationName: string): boolean {
    return this.associatedParentObjects.some(p => p.associationName === associationName)
  }

  addPattern (pattern: Pattern | undefined): void { // TODO check compatibilit of pattern
    const mm = this.getMetamodel()
    const parentPattern: Association[] = []
    pattern?.forEach(p => {
      if (p.type == 'attribute_value') {
        mm.getAttribute(this.class, p.name) // throws error if attribute does not exist
        if (Array.isArray(p.value)) {
          const paramID = this.rule.addIndexParameter(p.value.map(v => '_' + p.name + 'EQ' + v))
          p.parameter = paramID
        }
        this.attributes.push(p)
      } else if (p.type == 'association') {
        if (p.isOutgoing) {
          if (!p.targetClass) { p.targetClass = mm.getAssociation(this.class, p.associationName).target }
          this.rule.createObjectForAssociationPattern(p, this)
        } else {
          if (!p.targetClass) {
            p.targetClass = mm.findParentClass(this.class, p.associationName)
          }
          parentPattern.push(p)
        }
      }
    })
    const cl = mm.getClass(this.class)
    cl.partOf?.forEach(partOfRelation => {
      if (!parentPattern.find(p => p.associationName == partOfRelation.association && p.targetClass == partOfRelation.class)) {
        parentPattern.push({ type: 'association', associationName: partOfRelation.association, targetClass: partOfRelation.class, targetModifier: Modifier.exist, isOutgoing: false, explicit: false })
      }
    })
    parentPattern.forEach(parentPattern => {
      this.rule.addParentPatternToParentObject(this, parentPattern)
    })
  }

  setAttributeVariable (attrName: string, variableName: string): void {
    const attr = this.attributes.find(a => a.name == attrName && a.type == 'attribute_variable')
    if (attr && attr.type == 'attribute_variable' && attr.variable != variableName) {
      throw new Error(`Attribute "${attrName}" to variable with different name`)
    }
    this.attributes.push({ type: 'attribute_variable', name: attrName, variable: variableName })
  }

  setAttributeValue (attrName: string, value: AttributeType, parameter?: string): void {
    const attr = this.attributes.find(a => a.name == attrName && a.type == 'attribute_value' && a.value != value)
    if (attr) { throw new Error(`Attribute "${attrName}" already assigned to value with different value`) }
    this.attributes.push({ type: 'attribute_value', name: attrName, value, parameter })
  }

  getVariableNameForAttribute (attrName: string): string {
    const attr = this.attributes.find(a => a.name == attrName && a.type == 'attribute_variable')
    if (attr?.type == 'attribute_variable') { return attr.variable }
    return undefined
  }

  addObjectAssociationWithObject (associationName: string, associationPattern: Pattern, associatedObject: RuleObject, create: Create): AssociatedObject {
    this.checkAssociationPattern(associationName, associationPattern)
    const association = {
      associationName,
      associationPattern,
      objectName: associatedObject.name,
      objectClass: associatedObject.class,
      create,
      isOutgoing: true
    }
    const existingAssociatedObject = this.associatedObjects.find(r => r.associationName == association.associationName && r.objectName == association.objectName && association.isOutgoing)
    if (!existingAssociatedObject) {
      this.addAssociatedObject(association)
      associatedObject.associatedParentObjects.push({ objectName: this.name, objectClass: this.class, associationName: association.associationName, isOutgoing: false })
    } else {
      // TODO merge pattern
    }
    return association
  }

  checkAssociationPattern (associationName: string, associationPattern: Pattern): void {
    const mm = this.getMetamodel()
    associationPattern?.forEach(p => {
      if (p.type == 'attribute_value') {
        mm.getAssocationAttribute(this.class, associationName, p.name) // throws error if attribute does not exist
      }
      // Only attribute values can in a association pattern. No need to check other types
    })
  }

  getMetamodel (): Metamodel {
    return this.isSource ? this.rule.getSourceMetamodel() : this.rule.getTargetMetamodel()
  }

  clone (): any {
    const object = new RuleObject(this.class, this.rule, this.create, this.inCorrespondence, this.isParent, this.isSource)
    object.name = this.name
    object.attributes = this.attributes.map(a => structuredClone(a))
    object.associatedObjects = this.associatedObjects.map(r => structuredClone(r))
    object.associatedParentObjects = this.associatedParentObjects.map(p => structuredClone(p))
    object.hide = this.hide
    object.isOrigin = this.isOrigin
    return object
  }
}
