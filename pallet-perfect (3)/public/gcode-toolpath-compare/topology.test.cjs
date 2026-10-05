const assert=require('node:assert/strict');require('./gcode-io.js');require('./edit-core.js');
for(const mode of ['G90','G91']){
const source='G20\n'+mode+'\nG1 X0 Y0 Z0 B10 C350 F100\nG1 X2 Y4 Z6 B20 C370 F200 (keep)\nG1 X3 Y5 Z7 B25 C380\nG92 C92\nG1 X4 Y6 Z8\n';
const a=CncIO.parse(source).pts,edited=a.map(p=>({...p})),insert={...a[2],inserted:true,uid:'test',line:null,block:null};for(const ax of ['x','y','z','b','c'])insert[ax]=(a[1][ax]+a[2][ax])/2;edited.splice(2,0,insert);
let text=CncIO.exportProgram(source,a,edited),p=CncIO.parse(text).pts;assert.equal(p.length,edited.length);for(let i=1;i<p.length;i++)for(const ax of CncEdit.AXES)assert(Math.abs(p[i][ax]-edited[i][ax])<1e-6);assert(text.includes('G92 C92'));assert(!/\b[UVW]0/.test(text));
edited[2].z+=.05;text=CncIO.exportProgram(source,a,edited);assert(Math.abs(CncIO.parse(text).pts[2].z-edited[2].z)<1e-6);
edited.splice(3,1);text=CncIO.exportProgram(source,a,edited);p=CncIO.parse(text).pts;assert.equal(p.length,edited.length);for(let i=1;i<p.length;i++)for(const ax of CncEdit.AXES)assert(Math.abs(p[i][ax]-edited[i][ax])<1e-6);assert(text.includes('F200 (keep)'));
assert(CncEdit.changes(a,edited).some(r=>r.action==='add'));assert(CncEdit.changes(a,edited).some(r=>r.action==='delete'));
}
console.log('PASS: inserted interpolation, edited insertion, deletion, G90/G91, feed/comments, resets and change records');
