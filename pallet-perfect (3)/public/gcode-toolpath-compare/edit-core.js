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
  root.CncEdit = {AXES, editPoint, straighten, changes};
})(typeof globalThis === 'undefined' ? this : globalThis);
