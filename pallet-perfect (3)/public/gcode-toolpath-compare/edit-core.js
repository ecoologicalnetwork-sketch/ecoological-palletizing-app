/* Pure editing operations. Draft geometry only; never rewrites machine code. */
(function (root) {
  'use strict';
  const AXES = ['x', 'y', 'z', 'b', 'c', 'a', 'u', 'v', 'w'];
  function validate(points, start, end, axes) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end >= points.length || start > end) throw new Error('Choose valid motion points (point 0 is the assumed start).');
    if (!axes.length || axes.some(a => !AXES.includes(a))) throw new Error('Choose at least one axis to change.');
    const range=points.slice(start,end+1);
    if(range.some(p=>p.editable===false))throw new Error('Select linear motion points only.');
    if(new Set(range.map(p=>p.section)).size>1)throw new Error('Choose points within one section without resets, tool changes or unit changes.');
    if(range.some(p=>/G\s*(?:92|52)(?![\d.])/i.test(p.raw||''))) throw new Error('This selection includes a coordinate-setting block. Select motion points within one continuous cutting section.');
    if(new Set(range.map(p=>p.unitLabel)).size>1) throw new Error('This selection crosses a units change. Choose points in one unit system.');
  }
  function editPoint(points, index, values) {
    const axes = Object.keys(values);
    validate(points, index, index, axes);
    if (axes.some(a => !Number.isFinite(values[a]))) throw new Error('Enter a finite number for every unlocked axis.');
    return points.map((p, i) => i === index ? {...p, ...values} : {...p});
  }
  function straighten(points, start, end, axes) {
    validate(points, start, end, axes);
    if (end - start < 2) throw new Error('Choose endpoints with at least one point between them.');
    const result = points.map(p => ({...p}));
    for (let i = start + 1; i < end; i++) for (const a of axes) result[i][a] = points[start][a] + (points[end][a] - points[start][a]) * (i - start) / (end - start);
    return result;
  }
  function changes(before, after) {
    const rows = [];
    const key=p=>p.inserted?'new:'+p.uid:'line:'+p.line,old=new Map(before.slice(1).map(p=>[key(p),p])),current=new Set(after.slice(1).map(key));
    for(let i=1;i<after.length;i++){const p=after[i],q=old.get(key(p)),axes={};for(const a of AXES)if(!q||q[a]!==p[a])axes[a.toUpperCase()]={before:q?q[a]:null,after:p[a]};if(Object.keys(axes).length)rows.push({point:i,line:p.line,block:p.block,...(q?{}:{action:'add'}),axes});}
    for(const p of before.slice(1))if(!current.has(key(p)))rows.push({point:null,line:p.line,block:p.block,action:'delete',axes:{POINT:{before:'existing',after:'deleted'}}});
    return rows;
  }
  function insertPoint(points, index, t, uid) {
    validate(points,index-1,index,['x']);
    if(points[index-1].type!==points[index].type)throw new Error('Add a point within one continuous linear segment.');
    if(!Number.isFinite(t)||t<=0||t>=1)throw new Error('Choose a position strictly between 0% and 100%.');
    const a=points[index-1],b=points[index],p={...b,inserted:true,uid,line:null,block:null,raw:'Inserted linear point'};
    for(const axis of AXES){p[axis]=a[axis]+(b[axis]-a[axis])*t;if(!Number.isFinite(p[axis]))throw new Error('Neighbor coordinates are unavailable.');}
    const result=points.map(p=>({...p}));result.splice(index,0,p);return result;
  }
  function deletePoints(points, indices) {
    const remove=new Set(indices);
    if(!remove.size)throw new Error('Select a point to delete.');
    for(const i of remove){if(!Number.isInteger(i)||i<=1||i>=points.length-1)throw new Error('Keep the first and last motion points.');validate(points,i-1,i+1,['x']);}
    return points.filter((p,i)=>!remove.has(i)).map(p=>({...p}));
  }
  // Display-space Rz(C) Ry(B), matching the existing Thermwood cutter preview.
  // X/Y are transverse to the spindle; Z is the spindle direction. Blade
  // mounting chooses the zero-angle normal explicitly instead of inferring it
  // from travel direction.
  function cutterNormal(point, zeroAxis = 'x') {
    const b=point.b*Math.PI/180,c=point.c*Math.PI/180;
    if(!Number.isFinite(b)||!Number.isFinite(c))throw new Error('B/C orientation is unavailable at this point.');
    const cb=Math.cos(b),sb=Math.sin(b),cc=Math.cos(c),sc=Math.sin(c);
    const frame={x:{x:cb*cc,y:cb*sc,z:-sb},y:{x:-sc,y:cc,z:0},z:{x:sb*cc,y:sb*sc,z:cb}};
    if(!frame[zeroAxis])throw new Error('Choose a zero-angle blade normal.');
    return Object.fromEntries(Object.entries(frame[zeroAxis]).map(([k,v])=>[k,Math.abs(v)<1e-10?0:v]));
  }
  function cutterDirection(point, zeroAxis='x', mode='perpendicular') {
    if(mode==='perpendicular')return cutterNormal(point,zeroAxis);
    if(mode!=='parallel')throw new Error('Choose perpendicular or parallel dragging.');
    // A fixed in-plane axis, so switching modes never depends on the camera
    // or travel tangent. Prefer the other XY axis; Z-normal blades use X.
    const tangent={x:'y',y:'x',z:'x'}[zeroAxis];
    if(!tangent)throw new Error('Choose a zero-angle blade normal.');
    return cutterNormal(point,tangent);
  }
  function moveOnNormal(points,index,normal,distance,axes,pins=[]) {
    validate(points,index,index,axes);
    if(pins.includes(index))throw new Error('This endpoint is locked. Clear its pin before moving it.');
    if(!Number.isFinite(distance))throw new Error('Drag distance is not finite.');
    const blocked=['x','y','z'].filter(a=>Math.abs(normal[a])>1e-10&&!axes.includes(a));
    if(blocked.length)throw new Error('Unlock '+blocked.join('/').toUpperCase()+' to move along the selected drag guide.');
    const values={};
    for(const a of ['x','y','z'])if(normal[a])values[a]=Number((points[index][a]+normal[a]*distance).toFixed(10));
    return editPoint(points,index,values);
  }
  function morphRange(points,start,end,index,normal,distance,axes) {
    validate(points,start,end,axes);
    if(index<=start||index>=end)throw new Error('Drag a point inside the selected section; its endpoints stay fixed.');
    // Validate the guide/locks with the same rule as a single-point drag.
    moveOnNormal(points,index,normal,distance,axes);
    const lengths=[0];
    for(let i=start+1;i<=end;i++)lengths.push(lengths.at(-1)+Math.hypot(...['x','y','z'].map(a=>points[i][a]-points[i-1][a])));
    const result=points.map(p=>({...p})),peak=lengths[index-start],total=lengths.at(-1);
    for(let i=start+1;i<end;i++){
      const t=i<=index?(peak>1e-12?lengths[i-start]/peak:(i-start)/(index-start)):(total-peak>1e-12?(total-lengths[i-start])/(total-peak):(end-i)/(end-index));
      const weight=(1-Math.cos(Math.PI*t))/2;
      for(const a of ['x','y','z'])if(normal[a])result[i][a]=Number((points[i][a]+normal[a]*distance*weight).toFixed(10));
    }
    return result;
  }
  function evenCurve(points,start,end,apex,axes) {
    validate(points,start,end,axes);
    if(!Number.isInteger(apex)||apex<=start||apex>=end)throw new Error('Select an apex inside the section, between its locked endpoints.');
    const spatial=['x','y','z'].filter(a=>axes.includes(a));
    if(spatial.length<2)throw new Error('Unlock at least two of X, Y and Z to form a curve.');
    const origin=spatial.map(a=>points[start][a]),u=spatial.map((a,k)=>points[apex][a]-origin[k]),v=spatial.map((a,k)=>points[end][a]-origin[k]);
    const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0),length=Math.hypot(...u),endLength=Math.hypot(...v);
    if(!Number.isFinite(length+endLength)||length<1e-10||endLength<1e-10)throw new Error('Start, apex and end must be distinct in the unlocked position axes.');
    const e1=u.map(n=>n/length),vx=dot(v,e1),perp=v.map((n,i)=>n-vx*e1[i]),vy=Math.hypot(...perp);
    if(vy<1e-8*Math.max(length,endLength))throw new Error('These three points are on a straight line. Move the apex off the line or use Straighten section.');
    const e2=perp.map(n=>n/vy),cx=length/2,cy=(dot(v,v)-length*vx)/(2*vy),radius=Math.hypot(cx,cy);
    const a0=Math.atan2(-cy,-cx),am=Math.atan2(-cy,length-cx),a1=Math.atan2(vy-cy,vx-cx),tau=2*Math.PI,positive=a=>(a%tau+tau)%tau;
    let middle=positive(am-a0),finish=positive(a1-a0);
    if(middle>finish){middle-=tau;finish-=tau;}
    const result=points.map(p=>({...p}));
    for(let i=start+1;i<end;i++){
      if(i===apex)continue; // Preserve all three anchors exactly.
      const left=i<apex,t=left?(i-start)/(apex-start):(i-apex)/(end-apex),angle=a0+(left?middle*t:middle+(finish-middle)*t);
      const px=cx+radius*Math.cos(angle),py=cy+radius*Math.sin(angle);
      for(let k=0;k<spatial.length;k++)result[i][spatial[k]]=origin[k]+px*e1[k]+py*e2[k];
      for(const a of axes.filter(a=>!spatial.includes(a))){const lo=left?start:apex,hi=left?apex:end;result[i][a]=points[lo][a]+(points[hi][a]-points[lo][a])*t;}
      if(axes.some(a=>!Number.isFinite(result[i][a])))throw new Error('This curve cannot be formed from these coordinates.');
    }
    return result;
  }
  const validateSection=(points,start,end)=>validate(points,start,end,['x']);
  root.CncEdit = {AXES, editPoint, straighten, changes, cutterNormal, cutterDirection, moveOnNormal, morphRange, evenCurve, validateSection, insertPoint, deletePoints};
})(typeof globalThis === 'undefined' ? this : globalThis);

