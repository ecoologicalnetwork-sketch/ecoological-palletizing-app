/* Pure editing operations. Draft geometry only; never rewrites machine code. */
(function (root) {
  'use strict';
  const AXES = ['x', 'y', 'z', 'b', 'c', 'a', 'u', 'v', 'w'];
  function validate(points, start, end, axes) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end >= points.length || start > end) throw new Error('Choose valid motion points (point 0 is the assumed start).');
    if (!axes.length || axes.some(a => !AXES.includes(a))) throw new Error('Choose at least one axis to change.');
    const range=points.slice(start,end+1);
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
    for (let i = 1; i < before.length; i++) {
      const axes = {};
      for (const a of AXES) if (before[i][a] !== after[i][a]) axes[a.toUpperCase()] = {before: before[i][a], after: after[i][a]};
      if (Object.keys(axes).length) rows.push({point: i, line: before[i].line, block: before[i].block, axes});
    }
    return rows;
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
  function moveOnNormal(points,index,normal,distance,axes,pins=[]) {
    validate(points,index,index,axes);
    if(pins.includes(index))throw new Error('This endpoint is locked. Clear its pin before moving it.');
    if(!Number.isFinite(distance))throw new Error('Drag distance is not finite.');
    const blocked=['x','y','z'].filter(a=>Math.abs(normal[a])>1e-10&&!axes.includes(a));
    if(blocked.length)throw new Error('Unlock '+blocked.join('/').toUpperCase()+' to move along this blade normal.');
    const values={};
    for(const a of ['x','y','z'])if(normal[a])values[a]=Number((points[index][a]+normal[a]*distance).toFixed(10));
    return editPoint(points,index,values);
  }
  root.CncEdit = {AXES, editPoint, straighten, changes, cutterNormal, moveOnNormal};
})(typeof globalThis === 'undefined' ? this : globalThis);
