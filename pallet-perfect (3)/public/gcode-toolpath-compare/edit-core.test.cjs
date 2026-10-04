const assert=require('node:assert/strict');
require('./edit-core.js');
const pts=Array.from({length:6},(_,i)=>({x:i*2,y:i===2?8:i,z:10,b:i*20,c:350+i*2,a:0,u:0,v:0,w:0,line:i+20,block:i*10,raw:'original '+i}));
const original=JSON.stringify(pts);
const straight=CncEdit.straighten(pts,1,5,['x','y']);
assert.equal(straight[2].y,2);assert.equal(straight[3].y,3);
assert.deepEqual(straight[1],pts[1]);assert.deepEqual(straight[5],pts[5]);assert.deepEqual(straight[0],pts[0]);
for(let i=0;i<pts.length;i++) for(const a of ['z','b','c','a','u','v','w','line','raw']) assert.equal(straight[i][a],pts[i][a]);
assert.equal(JSON.stringify(pts),original);
const edited=CncEdit.editPoint(pts,3,{z:-7,c:720});assert.equal(edited[3].z,-7);assert.equal(edited[3].c,720);assert.equal(edited[3].x,pts[3].x);assert.deepEqual(edited[4],pts[4]);
assert.deepEqual(CncEdit.changes(pts,edited),[{point:3,line:23,block:30,axes:{Z:{before:10,after:-7},C:{before:356,after:720}}}]);
for(const args of [[0,3,['x']],[1,8,['x']],[3,1,['x']],[1,2,['x']],[1,3,[]],[1,3,['q']],[1.5,3,['x']]])assert.throws(()=>CncEdit.straighten(pts,...args));
assert.throws(()=>CncEdit.editPoint(pts,2,{x:NaN}));assert.throws(()=>CncEdit.editPoint(pts,2,{x:Infinity}));assert.throws(()=>CncEdit.editPoint(pts,0,{x:5}));
const rotary=pts.map(p=>({...p}));rotary[1].c=350;rotary[5].c=10;assert.equal(CncEdit.straighten(rotary,1,5,['c'])[3].c,180);
console.log('PASS: endpoint locks, axis locks, source preservation, isolated edits, invalid inputs, literal rotary interpolation, and change records');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const b of [0,25,-90,145])for(const c of [-8640,-45,90,450]){
  const n=CncEdit.cutterNormal({b,c},'x'),spindle=CncEdit.cutterNormal({b,c},'z');
  near(Math.hypot(n.x,n.y,n.z),1);near(n.x*spindle.x+n.y*spindle.y+n.z*spindle.z,0);
  const result=CncEdit.moveOnNormal(pts,3,n,.25,['x','y','z']);
  for(const a of ['x','y','z'])near(result[3][a]-pts[3][a],n[a]*.25);
  for(const a of ['b','c','a','u','v','w','raw'])assert.equal(result[3][a],pts[3][a]);
  assert.deepEqual(result[2],pts[2]);
}
assert.deepEqual(CncEdit.cutterNormal({b:0,c:0},'x'),{x:1,y:0,z:0});
assert.deepEqual(CncEdit.cutterNormal({b:0,c:90},'x'),{x:0,y:1,z:0});
assert.throws(()=>CncEdit.moveOnNormal(pts,3,{x:1,y:0,z:0},1,['y','z']));
assert.throws(()=>CncEdit.moveOnNormal(pts,3,{x:1,y:0,z:0},1,['x','y','z'],[3,5]));
const setup=pts.map(p=>({...p}));setup[2].raw='G92 X10';assert.throws(()=>CncEdit.moveOnNormal(setup,2,{x:1,y:0,z:0},1,['x']));
console.log('PASS: B/C-constrained drag, multi-turn C, perpendicularity, axis and endpoint locks');
for(const zero of ['x','y','z'])for(const b of [0,25,-90])for(const c of [-8640,-45,90,450]){
  const normal=CncEdit.cutterDirection({b,c},zero,'perpendicular'),parallel=CncEdit.cutterDirection({b,c},zero,'parallel');
  near(Math.hypot(parallel.x,parallel.y,parallel.z),1);near(normal.x*parallel.x+normal.y*parallel.y+normal.z*parallel.z,0);
  const result=CncEdit.moveOnNormal(pts,3,parallel,.2,['x','y','z']);
  for(const a of ['x','y','z'])near(result[3][a]-pts[3][a],parallel[a]*.2);
  for(const a of ['b','c','raw'])assert.equal(result[3][a],pts[3][a]);
}
assert.deepEqual(CncEdit.cutterDirection({b:0,c:0},'x','parallel'),{x:0,y:1,z:0});
assert.throws(()=>CncEdit.cutterDirection({b:0,c:0},'x','invalid'));
console.log('PASS: perpendicular/parallel modes remain orthogonal across blade calibrations and B/C angles');
const line=Array.from({length:10},(_,i)=>({...pts[1],x:i,y:0,z:0,line:i,raw:'G1 X'+i}));
const morph=CncEdit.morphRange(line,1,7,4,{x:0,y:1,z:0},2,['y']);
near(morph[4].y,2);near(morph[2].y,.5);near(morph[3].y,1.5);near(morph[5].y,1.5);near(morph[6].y,.5);
for(const i of [0,1,7,8,9])assert.deepEqual(morph[i],line[i]);
for(let i=0;i<line.length;i++)for(const a of ['x','z','b','c','line','raw'])assert.equal(morph[i][a],line[i][a]);
assert.equal(line[4].y,0);
assert.throws(()=>CncEdit.morphRange(line,1,7,1,{x:0,y:1,z:0},1,['y']));
assert.throws(()=>CncEdit.morphRange(line,1,7,4,{x:0,y:1,z:0},1,['x']));
const uneven=line.map(p=>({...p}));uneven[2].x=1.25;const weighted=CncEdit.morphRange(uneven,1,7,4,{x:0,y:1,z:0},2,['y']);assert.ok(weighted[2].y<morph[2].y);
const collapsed=line.map(p=>({...p,x:0}));assert.ok(CncEdit.morphRange(collapsed,1,7,4,{x:0,y:1,z:0},2,['y']).every(p=>Number.isFinite(p.y)));
for(const sign of [1,-1]){
 const arc=line.map(p=>({...p,z:3}));arc[1].x=1;arc[1].y=0;arc[3].x=0;arc[3].y=sign;arc[7].x=-1;arc[7].y=0;arc[1].c=360;arc[3].c=720;arc[7].c=0;
 const snapshot=JSON.stringify(arc),curve=CncEdit.evenCurve(arc,1,7,3,['x','y','c']);
 for(const i of [0,1,3,7,8,9])assert.deepEqual(curve[i],arc[i]);
 for(let i=1;i<=7;i++){near(Math.hypot(curve[i].x,curve[i].y),1);assert.ok(sign*curve[i].y>=-1e-10);for(const a of ['z','b','raw'])assert.equal(curve[i][a],arc[i][a]);}
 const dist=(i,j)=>Math.hypot(curve[i].x-curve[j].x,curve[i].y-curve[j].y);
 near(dist(1,2),dist(2,3));for(let i=4;i<7;i++)near(dist(i-1,i),dist(i,i+1));
 near(curve[2].c,540);near(curve[5].c,360);assert.equal(JSON.stringify(arc),snapshot);
 const space=arc.map(p=>({...p,z:p.y,y:p.y/Math.sqrt(2)}));for(const p of space)p.z/=Math.sqrt(2);
 const curve3=CncEdit.evenCurve(space,1,7,3,['x','y','z']);for(let i=1;i<=7;i++){near(Math.hypot(curve3[i].x,curve3[i].y,curve3[i].z),1);near(curve3[i].y,curve3[i].z);}
}
assert.throws(()=>CncEdit.evenCurve(line,1,7,4,['x','y']));
assert.throws(()=>CncEdit.evenCurve(line,1,7,4,['x','c']));
assert.throws(()=>CncEdit.evenCurve(line,1,7,1,['x','y']));
const boundary=line.map(p=>({...p}));boundary[2].raw='G52 X0';assert.throws(()=>CncEdit.validateSection(boundary,1,7));assert.throws(()=>CncEdit.morphRange(boundary,1,7,4,{x:0,y:1,z:0},1,['y']));assert.throws(()=>CncEdit.evenCurve(boundary,1,7,4,['x','y']));
boundary[2].raw='G1 X2';boundary[2].unitLabel='mm';assert.throws(()=>CncEdit.validateSection(boundary,1,7));
console.log('PASS: smooth section morph, fixed endpoints, axis/source preservation, arc-length falloff, 2D/3D curves, fixed apex, even spacing, rotary interpolation, and invalid ranges');
