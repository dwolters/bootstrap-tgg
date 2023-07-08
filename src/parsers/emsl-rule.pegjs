RULES
  = TRIPLERULE*

TRIPLERULE
  = "tripleRule" name:ID ":" tggName:ID BEGIN sourceBlock:SOURCEBLOCK? targetBlock:TARGETBLOCK? correspondenceBlock:CORRESPONDENCEBLOCK? END _ 
    { return { name, tggName, sourceBlock, targetBlock, correspondenceBlock }; }

SOURCEBLOCK
  = "source" BEGIN objects:OBJECT* END
    { return objects; }
    
TARGETBLOCK
  = "target" BEGIN objects:OBJECT* END
    { return objects; }

OBJECT
  = created:CREATION className:ID _ parent:(":" @ID) properties:(BEGIN @(ASSOCIATION / ATTRIBUTE)* END)?
    { return {created,  class: className, parent, properties }; }
    
ASSOCIATION_TYPE = type:('-' /'<>-' / '<+>-') {return {'-':'assocation','<>-':'aggregation','<+>-':'composition'}[type];}

ASSOCIATION
  = created:CREATION _ type:ASSOCIATION_TYPE assocationName:ID '->' targetClass:ID attributes:(BEGIN @ATTRIBUTE* END)?
    { return {created, type, assocationName, targetClass, attributes }; }
    
ATTRIBUTE
  = "." name:ID ":=" value:VALUE
    { return { type:'attribute', name, value }; }

VALUE = _ value:(STRING_VALUE / BOOLEAN_VALUE / NUMBER_VALUE / ENUM_VALUE / VARIABLE) _  { return value; }
VARIABLE = "<" name:ID ">" {return {type:'variable', name};}
BOOLEAN_VALUE = value:('true' / 'false' / '0' / '1' / 'TRUE' / 'FALSE') { return {type: 'boolean', value: (value == '1' || value.toLowerCase() == 'true') ? true : false}; }
NUMBER_VALUE = value:([0-9]+('.'[0-9]+)?)  { return {type: 'number', value: parseFloat(value.join(''))}; }
STRING_VALUE = '"' value:([^"]*) '"' { return {type: 'string', value: value.join('')}; }
ENUM_VALUE = value:ID { return {type: 'enum', value}; }

CORRESPONDENCEBLOCK
  = "correspondence" BEGIN CORRESPONDENCEMAPPINGS:CORRESPONDENCEMAPPINGS END
    { return CORRESPONDENCEMAPPINGS; }

CORRESPONDENCEMAPPINGS
  = FIRST:CORRESPONDENCEMAPPING REST:(_ CORRESPONDENCEMAPPING)*
    { return [FIRST].concat(REST.map(item => item[1])); }

CORRESPONDENCEMAPPING
  = created:CREATION sourceClass:ID "<-" _ ":" name:ID "->" targetClass:ID
    { return {created, sourceClass, name, targetClass }; }
    
CREATION = op:('++')? {return op == '++';}

STRICT_ID = id:([A-Za-z0-9_])+ {return id.join('');}
COMPOSITE_ID = id1:STRICT_ID id2:('.' @STRICT_ID)? {return (id2 ? id1 + '.' + id2 : id1);}
ID = _ id:STRICT_ID _ {return id;}

BEGIN = _ "{" _
END = _ "}" _
_  = [ \t\n\r]*