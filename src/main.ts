import Mapping from './classes/Mapping'
import NameGenerator from './classes/NameGenerator'

export default function generateTGG (mapping: string, sourceMetamodel: string, targetMetamodel: string): string {
  NameGenerator.clearAll()
  const mappingHelper = new Mapping(mapping, sourceMetamodel, targetMetamodel)
  const tgg = mappingHelper.generateTGG()
  const tggStr = tgg.generateTGGString(true)
  return tggStr
}

module.exports = generateTGG
