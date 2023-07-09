{{
  function implodeToObject(arr) {
    let obj = {};
    arr.forEach(i => {
      for(let key in i) {
        obj[key] = i[key];
      }
    })
    return obj;
  }
}}
MAPPING = options:OPTION* classMapping:CLASS_MAPPING+ {return {options,classMapping}}
OPTION = _ ':' name:STRICT_ID  values:(_ '=' _ @OPTION_VALUE ';')? {return {name, values}}
OPTION_VALUE = value:COMPOSITE_ID tail:(_ ',' _ @COMPOSITE_ID)* {return (Array.isArray(tail) && tail.length > 0 ? [value, ...tail] : [value])}
CLASS_MAPPING = source:ID sourceModifier:MODIFIER? sourcePattern:PATTERN? names:MAPPING_NAME target:ID targetModifier:MODIFIER? targetPattern:PATTERN? properties:PROPERTY_MAPPING* {return {...names,source, sourceModifier, sourcePattern, target, targetModifier, targetPattern, properties}}
MAPPING_NAME = '<=' name:ID? correspondenceName:(':' @ID)? '='? '>' {return {name, correspondenceName};}

PROPERTY_MAPPING = _ source:(TARGET_PROPERTY / TARGET_REFERENCE / REFERENCE_PATTERN) _ '<=>' _ target:(TARGET_PROPERTY / TARGET_REFERENCE / REFERENCE_PATTERN) _ valueMapping:VALUE_MAPPING? _ {return {source,target,valueMapping}}
TARGET_PROPERTY = '.' target:STRICT_ID { return target;}
TARGET_REFERENCE = associationPattern:REFERENCE_PATTERN targetAttribute:('.' @ID) {return {...associationPattern,targetAttribute,type:"associated_attribute"};}
VALUE_MAPPING = '[' _ first:VALUE_PAIR tail:(_ "," _ @VALUE_PAIR _)* ']' { return (Array.isArray(tail) && tail.length > 0 ? [first, ...tail] : [first]);} 
VALUE_PAIR = leftValue:VALUE _ "=" _ rightValue:VALUE { return {source: leftValue, target: rightValue}; }
OUTGOING_CAP = startCap:('<' /'<>' / '<+>')? {return !startCap || Array.isArray(startCap) || startCap != '<';}

PATTERN = BEGIN pattern:(ATTRIBUTE_VALUE_PATTERN / REFERENCE_PATTERN)+ END {return pattern;}
ATTRIBUTE_PATTERN = BEGIN pattern:ATTRIBUTE_VALUE_PATTERN+ END {return pattern;}
ATTRIBUTE_VALUE_PATTERN = "." name:ID "=" value:VALUE {return ({type:'attribute_value', name, value});}

REFERENCE_PATTERN = outgoingCap:OUTGOING_CAP? "-" associationName:STRICT_ID associationPattern:ATTRIBUTE_PATTERN? target:TARGET_PATTERN? {return ({type:'association', associationName, associationPattern, isOutgoing:outgoingCap, ...target, explicit:true});}
TARGET_PATTERN = '-' ('>' / '<>' / '<+>')? targetClass:ID? targetModifier:MODIFIER? targetPattern:ATTRIBUTE_PATTERN? {return {targetClass,targetModifier,targetPattern}}

STRICT_ID = id:([A-Za-z0-9_])+ {return id.join('');}
COMPOSITE_ID = id1:STRICT_ID id2:('.' @STRICT_ID)? {return (id2 ? id1 + '.' + id2 : id1);}
ID = _ id:STRICT_ID _ {return id;}

VALUE = _ value:(STRING_VALUE / BOOLEAN_VALUE / NUMBER_VALUE / ENUM_VALUE / VALUE_ALTERNATIVES) _  { return value; }
VALUE_ALTERNATIVES = '[' _ first:VALUE tail:(_ "," _ @VALUE _)* ']' { return (Array.isArray(tail) && tail.length > 0 ? [first, ...tail] : [first]);} 
BOOLEAN_VALUE = value:('true' / 'false' / 'TRUE' / 'FALSE') { return (value.toLowerCase() == 'true') ? true : false; }
NUMBER_VALUE = value:([0-9]+('.'[0-9]+)?)  { return parseFloat(value.join('')); }
STRING_VALUE = '"' value:([^"]*) '"' { return value.join(''); }
ENUM_VALUE = value:ID { return value; }

MODIFIER = modifier:('!' / '+' / '?') {return {'!':'exist','+':'create','?':'any'}[modifier]}

BEGIN = _ "{" _
END = _ "}" _
_  = [ \t\n\r]*
