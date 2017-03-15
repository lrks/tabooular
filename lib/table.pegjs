start
  = Skip* t:Table Skip* { return t; }


//------------------------------------//
//                Base                //
//------------------------------------//
LineTerminator  // https://github.com/pegjs/pegjs/blob/master/examples/javascript.pegjs
  = [\n\r\u2028\u2029]

WhiteSpace      // https://github.com/pegjs/pegjs/blob/master/examples/javascript.pegjs
  = "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"
  / "\uFEFF"
  / [\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]

EndOfLine
  = LineTerminator
  / !.

PositiveInteger
  = $([1-9][0-9]+)
  / $[1-9]

AloneComment
  = ";" (!EndOfLine .)*
  
Comment
  = WhiteSpace+ AloneComment

RelaxComment
  = WhiteSpace* AloneComment

Skip
  = WhiteSpace
  / LineTerminator
  / AloneComment


//------------------------------------//
//                Cell                //
//------------------------------------//
Separator
  = "&"
  / "|"

InSeparator
  = "^"
  / "_"
  
NeckSeparator
  = WhiteSpace+ { return "&"; }
  / "&"
  / "|"


Justifier
  = "<"
  / ">"

Escaper
  = "\\"
  
LineBreaker
  = "\\"
  

NotCellCharacter
  = Separator
  / WhiteSpace+ InSeparator &WhiteSpace (RelaxComment / WhiteSpace)*
  / WhiteSpace+ LineBreaker !(Separator / InSeparator / Escaper / LineBreaker / Justifier) (Comment / WhiteSpace)*
  / WhiteSpace* Justifier+ &WhiteSpace
  / WhiteSpace Justifier+ (RelaxComment / WhiteSpace)*
  / Comment
  / EndOfLine
  
CellCharacter
  = Escaper esc:(Separator / InSeparator / Escaper / LineBreaker / Justifier) { return esc; }
  / !NotCellCharacter char:. { return char; }

RelaxCellString
  = s:CellCharacter* { return s.join('').trim(); }
  
CellString
  = s:CellCharacter+ { return s.join('').trim(); }

JustifierString
  = j:Justifier+ { return j.join(''); }
  
SlashCell
  = s1:RelaxCellString WhiteSpace+ sep:InSeparator (RelaxComment / WhiteSpace)* s2:RelaxCellString { return [s1, sep, s2]; }

Cell
  = s:SlashCell { return {type:'normal', data:s} }
  / s:(SlashCell / RelaxCellString) WhiteSpace+ LineBreaker (Comment / WhiteSpace)* { return {type: 'linebreak', data:s} }
  / WhiteSpace* j1:JustifierString &WhiteSpace s:(SlashCell / RelaxCellString) WhiteSpace+ j2:JustifierString (RelaxComment / WhiteSpace)* { return {type:'join', data:s, justifier:[j1, j2]} }
  / WhiteSpace* j:JustifierString &WhiteSpace s:(SlashCell / RelaxCellString) WhiteSpace+ LineBreaker (Comment / WhiteSpace)* { return {type: 'startjoin', data:s, justifier:j} }
  / WhiteSpace* j:JustifierString &WhiteSpace s:(SlashCell / RelaxCellString) { return {type: 'startjoin', data:s, justifier:j} }
  / s:(SlashCell / RelaxCellString) WhiteSpace+ j:JustifierString (RelaxComment / WhiteSpace)* { return {type: 'endjoin', data:s, justifier:j} }
  / s:CellString { return {type:'normal', data:s} }

NeckCell
  = s:(Justifier / "=")+ { return (s.join('').replace(/=/g, '') + "=").charAt(0); }


//------------------------------------//
//                Table               //
//------------------------------------//
Table
  = head:Head* neck:Neck body:Body { return {head:head, neck:neck, body:body}; }

Row
  = c1:Cell cs:(Separator Cell)* Comment? EndOfLine Skip* { return [c1].concat(cs.map(function(x){return x[1];})); }                                                               // A & B & C   ;   A & B   ;   A
  / cs:(Separator Cell)+ Comment? EndOfLine Skip* { return [{type:'normal',data:''}].concat(cs.map(function(x){return x[1];})); }                                                  //   & B & C   ;     & B   ;   
  / cs:(Cell Separator)+ RelaxComment? EndOfLine Skip*  { return cs.map(function(x){return x[0];}).concat({type:'normal',data:''}); }                                              // A & B &     ;   A &     ;   
  / Separator cs:(Cell Separator)* RelaxComment? EndOfLine Skip*  { return [{type:'normal',data:''}].concat(cs.map(function(x){return x[0];})).concat({type:'normal',data:''}); }  //   & B &     ;     &     ;

Head
  = !Neck r:Row { return r; }

Neck
  = c1:NeckCell cs:(NeckSeparator NeckCell)* RelaxComment? EndOfLine Skip* { return [c1].concat(Array.prototype.concat.apply([], cs)); }

Body
  = b:Liver+ bs:(Rib Liver+)* { return [b].concat(bs.map(function(v){return v[1];})); }
  
Liver
  = !Rib r:Row { return r; }

Rib
  = "---" "-"* RelaxComment? EndOfLine Skip* { return null; }