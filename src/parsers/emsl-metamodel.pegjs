{{
  function splitMetamodelBody(body) {
    let split = {
      enums: [],
      classes: []
    }
    body.forEach(i => {
      if(i.values)
        split.enums.push(i)
      else 
        split.classes.push(i);
    })
    return split;
  }
  function assocType(type) {
  	if(type == '<>') return 'aggregation';
    if(type == '<+>') return 'composition';
    return 'association';
  }
  function splitProps(props) {
    let split = {
      attributes: [],
      associations: []
    }
    props.forEach(p => {
      if(p.target)
        split.associations.push(p);
      else
        split.attributes.push(p);
    })
    return split;
  }
}}

META = "metamodel" id:ID BEGIN body:(ENUM / CLASS)* END 
  {return {name: id, ...splitMetamodelBody(body)};}
ID = _ id:([A-Za-z0-9_])+ _ 
  {return id.join('');}
CLASS = abstract:("abstract")? name:ID sup:SUPERCLASS? properties:CLASSBODY? 
  {return {name:name, abstract:(abstract?true:false),extends:sup||[], ...properties}}
SUPERCLASS = ':' head:ID tail:(_ ',' _ @ID)* { return [head, ...tail]; }
CLASSBODY = BEGIN props:( ATTRIBUTE / REFERENCE )+ END
  {return splitProps(props)}
ATTRIBUTE = "." name:ID ":" type:ID 
  {return {name,type}}
REFERENCE = type:('<>' / '<+>')? '-' name:ID '(' lower:BOUND '..' upper:BOUND ')->' target:ID body:REFERENCEBODY? {return {name,lower,upper,target,type:assocType(type),attributes:body|| []}}
REFERENCEBODY = BEGIN props:ATTRIBUTE+ END {return props}
ENUM = "enum" name:ID values:ENUMBODY {return {name,values}}
ENUMBODY = BEGIN values:ID* END {return values;}

BOUND = value:([0-9]+ / '*') 
  {return (value == '*'?undefined:parseInt(value))}


BEGIN = _ "{" _
END = _ "}" _
_  = [ \t\n\r]*