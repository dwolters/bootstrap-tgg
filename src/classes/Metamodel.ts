import type * as EMSLMetamodel from '../types/emsl-metamodel'
import parser from '../parsers/emsl-metamodel'
export class Metamodel {
  name: string
  classes: EMSLMetamodel.Class[]
  enums: EMSLMetamodel.Enum[]
  // TODO iterate over super classes
  constructor (metamodelStr: string, prefix: string) {
    // Remove one line comments
    metamodelStr = metamodelStr.replaceAll(/\/\/.*/g, '')
    const metamodel: EMSLMetamodel.Metamodel = parser.parse(metamodelStr, { grammarSource: prefix + 'Metamodel' })
    this.name = metamodel.name
    this.classes = metamodel.classes
    this.enums = metamodel.enums
    this.addPartOf()
  }

  findParentClass // Add all compositions sources and the name of the composition to targets
  (targetClassName: string, associationName: string): string {
    for (let i = 0; i < this.classes.length; i++) {
      const cl = this.classes[i]
      if (cl.associations?.find(r => r.name == associationName && this.isSameOrSubClass(targetClassName, r.target))) { return cl.name }
    }
    throw new Error(`Could not find a target class for a association "${associationName}" in metamodel "${this.name}"`)
  }

  addPartOf (): void {
    const compositionMap = {}
    // eslint-disable-next-line @typescript-eslint/ban-types
    function addComposition (map: Object, prop: string, value: EMSLMetamodel.Dependency): void {
      if (Array.isArray(map[prop])) { map[prop].push(value) } else { map[prop] = [value] }
    }
    // Check all classes for targets of compositions
    this.classes.forEach(c => {
      c.associations?.forEach(a => {
        if (a.type == 'composition') {
          const dependency: EMSLMetamodel.Dependency = {
            class: c.name,
            association: a.name
          }
          addComposition(compositionMap, a.target, dependency)
        }
      })
    })

    // Add all composition sources and the name of the composition to targets
    this.classes.forEach(c => {
      c.partOf = compositionMap[c.name] || []
    })

    // Add all compositions from ancestor classes
    this.classes.forEach(c => {
      this.addInheritedPartOf(c, c.partOf)
    })
  }

  private addInheritedPartOf (c: EMSLMetamodel.Class, accumulator: EMSLMetamodel.Dependency[]): void {
    c.extends.forEach(extendedClassName => {
      const extendedClass = this.getClass(extendedClassName)
      extendedClass.partOf?.forEach(d => { this.addDependencyIfNotExists(accumulator, d) })
      this.addInheritedPartOf(extendedClass, accumulator)
    })
  }

  private addDependencyIfNotExists (accumulator: EMSLMetamodel.Dependency[], newDep: EMSLMetamodel.Dependency): void {
    if (!accumulator.find(dep => dep.class == newDep.class && dep.association == newDep.association)) { accumulator.push(newDep) }
  }

  getClass (classname: string, ignoreError: boolean = false): EMSLMetamodel.Class {
    const cl = this.classes.find(c => c.name == classname)
    if (!cl && !ignoreError) { throw new Error(`Unknown class "${classname}" in metamodel "${this.name}"`) }
    return cl
  }

  getAllClasses (includeAbstract: boolean): string[] {
    return this.classes.filter(cl => !cl.abstract || includeAbstract).map(cl => cl.name)
  }

  hasClass (className: string): boolean {
    return this.getClass(className) !== undefined
  }

  getAttribute (className: string, propertyName: string, isLowestClass: boolean = true): EMSLMetamodel.Attribute {
    const c = this.getClass(className)
    if (!c) { throw new Error(`Unknown class "${className}" in metamodel "${this.name}"`) }
    let a = c.attributes?.find(p => p.name == propertyName)
    if (Array.isArray(c.extends)) {
      for (let i = 0; i < c.extends.length && !a; i++) {
        a = this.getAttribute(c.extends[i], propertyName, false)
      }
    }
    if (!a && isLowestClass) { throw new Error(`Unknown attribute "${propertyName}" class "${className}" in metamodel "${this.name}"`) }
    return a
  }

  getAssocationAttribute (className: string, assocationName: string, attributeName: string): EMSLMetamodel.Attribute {
    const association = this.getAssociation(className, assocationName)
    const attribute = association.attributes.find(a => a.name == attributeName)
    if (!attribute) { throw new Error(`Unknown attribute "${attributeName}" of association "${assocationName}" of class "${className}" in metamodel "${this.name}"`) }
    return attribute
  }

  getAssociation (className: string, propertyName: string, ignoreError: boolean = false): EMSLMetamodel.Association {
    const c = this.getClass(className, ignoreError)
    if (!c) { return }
    let r = c.associations?.find(p => p.name == propertyName)
    if (Array.isArray(c.extends)) {
      for (let i = 0; i < c.extends.length && !r; i++) {
        r = this.getAssociation(c.extends[i], propertyName, true)
      }
    }
    if (!r && !ignoreError) { throw new Error(`Unknown association "${propertyName}" of class "${className}" in metamodel "${this.name}"`) }
    return r
  }

  isSameOrSubClass (subClassName: string, superClassName: string): boolean {
    if (subClassName == superClassName) { return true }
    const subClass = this.getClass(subClassName)
    let found = false
    subClass.extends.forEach(extendedClassName => {
      if (!found) {
        found = this.isSameOrSubClass(extendedClassName, superClassName)
      }
    })
    return found
  }

  isComposition (className: string, associationName: string): boolean {
    const mmAssociation = this.getAssociation(className, associationName)
    return mmAssociation.type == 'composition'
  }

  inferTargetClassofAssociation (className: string, associationName: string, targetClass: string): string {
    const mmAssociation = this.getAssociation(className, associationName)
    if (!mmAssociation) { throw new Error(`Unknown association "${associationName}" of class "${className}" in metamodel "${this.name}"`) }
    if (!targetClass) {
      return mmAssociation.target
    } else if (!this.isSameOrSubClass(targetClass, mmAssociation.target)) {
      throw new Error('The target class is not compatible to association definition')
    }
    return targetClass
  }
}
