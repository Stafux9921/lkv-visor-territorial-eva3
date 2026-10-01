// PDF autocontenido con fuente estándar WinAnsi y offsets calculados por bytes.
function escapePDF(value){return value.replace(/[^\x20-\xff]/g,'?').replace(/[\\()]/g,'\\$&');}
const widths=[556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,556,278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
function wrap(text,maxWidth=508,fontSize=11){
  const result=[];let line='',size=0;
  for(const char of text){
    const unit=(widths[char.charCodeAt(0)]||556)*fontSize/1000;
    if(size+unit>maxWidth && line){result.push(line);line='';size=0;}
    line+=char;size+=unit;
  }
  result.push(line);return result;
}
export function pointPDF(point,reportId){
  const lines=['LKV | VISOR TERRITORIAL MUNICIPAL','Informe de punto territorial','',
    'Identificador: '+point.id, 'Punto: '+point.name,'Categoría: '+point.category,'Comuna: '+point.commune,
    'Coordenadas: '+point.latitude+', '+point.longitude,'Versión del registro: '+point.version,
    'Generado: '+new Date().toISOString(),'Informe: '+reportId,'',...wrap(point.description),'',
    'ESTIMACIÓN REFERENCIAL','Datos sintéticos. No constituye información oficial, certificada ni definitiva.',
    'Documento demostrativo. No contiene contactos privados.'];
  const commands='BT /F1 11 Tf 52 735 Td 14 TL '+lines.flatMap(line=>wrap(line)).map((line,i)=>(i?'T* ':'')+'('+escapePDF(line)+') Tj').join('\n')+' ET';
  const stream=Buffer.from(commands,'latin1');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Length '+stream.length+' >>\nstream\n'+commands+'\nendstream'];
  let output='%PDF-1.4\n',offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(output,'latin1'));output+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';});
  const start=Buffer.byteLength(output,'latin1');
  output+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+
    'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF';
  return Buffer.from(output,'latin1');
}
