import Mapping from './classes/Mapping'
import * as fs from 'fs'
import * as path from 'path'
import { readFileSync } from 'node:fs'
import jsonfile from 'jsonfile'
import config from 'config'
import NameGenerator from './classes/NameGenerator'

const mappingIndex = jsonfile.readFileSync(path.join(config.get('sourceFolder'), 'index.json'))

const mappingFiles = mappingIndex.map(entry => {
  return {
    sourceMetamodelFile: path.join(config.get('sourceFolder'), entry.sourceMetamodelFile),
    targetMetamodelFile: path.join(config.get('sourceFolder'), entry.targetMetamodelFile),
    mappingFile: path.join(config.get('sourceFolder'), entry.mappingFile),
    outputFile: path.join(config.get('targetFolder'), entry.outputFile)
  }
})

mappingFiles.forEach(testMapping => {
  NameGenerator.clearAll()
  const { sourceMetamodelFile, targetMetamodelFile, mappingFile, outputFile } = testMapping
  const mappingStr = readFileSync(mappingFile).toString()
  const sourceMetamodelStr = readFileSync(sourceMetamodelFile).toString()
  const targetMetamodelStr = readFileSync(targetMetamodelFile).toString()
  console.log('Generating: ', outputFile)
  const mappingHelper = new Mapping(mappingStr, sourceMetamodelStr, targetMetamodelStr)
  const tgg = mappingHelper.generateTGG()
  const tggStr = tgg.generateTGGString(true)
  fs.writeFileSync(outputFile, tggStr)
})
