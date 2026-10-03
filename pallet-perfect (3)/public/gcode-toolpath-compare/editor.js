(function () {
  'use strict';
  window.createCncEditor = function (api) {
    const $ = id => document.getElementById(id);
    const panel = document.createElement('section');
    panel.className = 'editPanel';
    panel.setAttribute('aria-label', 'Point editing workspace');
    panel.innerHTML = `
      <div class="editHeader"><div><h2>Point editing workspace</h2><p class="editHelp">Keep A as your reference. Edit a working copy in B, preview changes, then apply or undo.</p></div><span class="editBadge">Draft geometry · no machine-code export</span></div>
      <p id="programLimitations" class="editHelp"></p><div class="editActions"><button id="copyToB">Copy A to B for editing</button><button id="editUndo" disabled>Undo</button><button id="editRedo" disabled>Redo</button><span id="editCount" class="editHelp">No draft edits</span></div>
      <div class="editColumns">
        <fieldset><legend>1. Select a point in B</legend><div class="editSelect"><label>Point number<input id="editPoint" aria-label="Edit point number" type="number" min="1" step="1" value="1"></label><button id="selectPoint">Go to point</button><button id="useCurrent">Use current B point</button></div><p class="editHelp" id="selectedInfo">Load B or copy A to begin. Click a B point in the viewer to select it.</p>
        <div id="editAxes" class="editAxes"></div><p class="editHelp">Checked axes can change. Unchecked axes stay fixed. Linear axes use the program’s units; rotary axes use degrees.</p><button id="previewPoint">Preview point edit</button></fieldset>
        <fieldset><legend>2. Straighten a range</legend><div class="editSelect"><label>Start point<input id="rangeStart" type="number" min="1" step="1" value="1"></label><label>End point<input id="rangeEnd" type="number" min="1" step="1" value="3"></label></div><div class="editActions" style="margin-top:8px"><button id="pinStart">Use selected as start</button><button id="pinEnd">Use selected as end</button></div><p class="editHelp">Endpoints stay fixed. Interior points are evenly interpolated on the checked axes above. Other axes stay unchanged. B/C use their literal numeric angles, with no automatic 360° wrap.</p><button id="previewStraight">Preview straightening</button></fieldset>
      </div>
      <div id="editStatus" class="editStatus" role="status" aria-live="polite">Select points by number or click the blue point dots.</div>
      <div class="editActions"><button id="applyEdit" class="primary" disabled>Apply draft edit</button><button id="cancelEdit" disabled>Cancel preview</button></div>
      <div id="editDiff" class="editDiff"></div>
      <details><summary>Give ChatGPT an exact editing request</summary><p class="editHelp">Includes the B filename, selected range, source lines, axis locks, and all draft changes. Nothing is sent automatically. Review and copy the text into your chat.</p><div class="editIntent"><label for="editIntent">What should change?</label><textarea id="editIntent" placeholder="Example: even the curve between these points through the apex, changing X and Y only."></textarea></div><div class="editActions"><button id="makeRequest">Prepare request</button><button id="copyRequest" disabled>Copy request</button><button id="downloadPlan">Download edit plan</button></div><textarea id="requestText" aria-label="ChatGPT editing request" readonly placeholder="Prepare a request to see the exact context here."></textarea></details>
      <p class="editHelp">Draft edits change the displayed coordinates only. Source G-code stays intact. This viewer does not fully interpret arcs, macros, or machine offsets; the edit plan is for review, not CNC execution.</p>`;
    document.querySelector('.viewerWrap').after(panel);
    let selected = 1, base = null, undo = [], redo = [], pending = null, message = '';
    const clone = pts => pts.map(p => ({...p}));
    const fmt = n => Number.isFinite(n) ? String(Number(n.toFixed(6))) : '—';
    function say(text, error = false) { message = text; $('editStatus').textContent = text; $('editStatus').classList.toggle('error', error); }
    function program() { return api.getB(); }
    function reset() {
      base = clone(program().pts); undo = []; redo = []; pending = null;
      selected = Math.min(1, Math.max(0, base.length - 1));
      $('rangeStart').value = 1; $('rangeEnd').value = Math.max(1, base.length - 1);
      $('requestText').value = ''; $('copyRequest').disabled = true;
      axesUI(); refresh(); say('Select a B point, unlock the axes you want to change, and preview the result.');
    }
    function axesUI() {
      const used = ['x','y','z','b','c', ...['a','u','v','w'].filter(a => program().axesUsed.has(a.toUpperCase()))];
      $('editAxes').replaceChildren();
      for (const a of used) {
        const wrapper = document.createElement('div'), label = document.createElement('label'), check = document.createElement('input'), input = document.createElement('input');
        check.type = 'checkbox'; check.id = 'unlock_'+a; check.checked = a === 'x' || a === 'y'; check.setAttribute('aria-label','Change '+a.toUpperCase());
        label.append(check, ' '+a.toUpperCase()); input.type = 'number'; input.step = 'any'; input.id = 'value_'+a; input.setAttribute('aria-label',a.toUpperCase()+' coordinate');
        check.addEventListener('change', () => { cancel(false); input.disabled = !check.checked || !program().pts[selected]; });
        input.addEventListener('input', () => cancel(false));
        wrapper.append(label,input); $('editAxes').append(wrapper);
      }
    }
    function axes() { return CncEdit.AXES.filter(a => $('unlock_'+a)?.checked); }
    function refresh() {
      const b = program(), p = (pending ? pending.pts : b.pts)[selected], has = b.pts.length > 1;
      $('requestText').value=''; $('copyRequest').disabled=true;
      $('programLimitations').textContent=b.limitations?.length ? 'This file includes '+b.limitations.join(', ')+'. These commands are not fully simulated. Review source coordinates within a single cutting section.' : '';
      $('editPoint').value = selected || 1; $('editPoint').max = Math.max(1,b.pts.length-1);
      $('selectedInfo').textContent = p ? `B point ${selected} · source line ${p.line}${p.block !== null ? ' · N'+p.block : ''} · ${b.unitLabel}` : 'Load B or copy A to begin. Click a B point in the viewer to select it.';
      for (const a of CncEdit.AXES) if ($('value_'+a)) { $('value_'+a).value = p ? String(p[a]) : ''; $('value_'+a).disabled = !p || !$('unlock_'+a).checked; }
      for (const id of ['selectPoint','useCurrent','pinStart','pinEnd','previewPoint','previewStraight','makeRequest','downloadPlan']) $(id).disabled = !has;
      $('copyToB').disabled = api.getA().pts.length < 2;
      $('editUndo').disabled = !undo.length; $('editRedo').disabled = !redo.length;
      $('applyEdit').disabled = !pending; $('cancelEdit').disabled = !pending;
      const diffs = base ? CncEdit.changes(base,b.pts) : [];
      $('editCount').textContent = `${diffs.length} point${diffs.length===1?'':'s'} changed in draft${pending?' · preview pending':''}`;
      renderDiff(pending ? CncEdit.changes(b.pts,pending.pts) : diffs);
    }
    function renderDiff(rows) {
      const target = $('editDiff'); target.replaceChildren(); if (!rows.length) return;
      const table = document.createElement('table'), caption = document.createElement('caption'); caption.textContent = pending ? 'Preview changes (not applied)' : 'Applied draft changes from loaded B'; table.append(caption);
      const head = document.createElement('tr'); for (const t of ['Point / line','Axis','Before','After']) { const th=document.createElement('th'); th.textContent=t; head.append(th); } table.append(head);
      for (const row of rows.slice(0,100)) for (const [axis,values] of Object.entries(row.axes)) { const tr=document.createElement('tr'); for (const value of [`${row.point} / ${row.line}`,axis,fmt(values.before),fmt(values.after)]) { const td=document.createElement('td'); td.textContent=value; tr.append(td); } table.append(tr); }
      target.append(table); if(rows.length>100) { const p=document.createElement('p'); p.textContent=`Showing 100 of ${rows.length} changed points. The edit plan includes all changes.`; target.append(p); }
    }
    function cancel(redraw=true) { pending=null; $('applyEdit').disabled=true; $('cancelEdit').disabled=true; $('editDiff').replaceChildren(); $('requestText').value=''; $('copyRequest').disabled=true; if(redraw) refresh(); api.draw(); }
    function choose(i) {
      if (!Number.isInteger(i) || i<1 || i>=program().pts.length) throw new Error('Enter a valid B motion point number.');
      pending=null; selected=i; refresh(); api.goB(i); say(`Selected B point ${i}. Checked axes are editable.`);
    }
    function preview(pts, description) {
      const rows=CncEdit.changes(program().pts,pts);
      if(!rows.length) { cancel(); say('No coordinates would change.'); return; }
      pending={pts,description}; refresh(); api.draw(); say(`${description}: ${rows.length} point(s) would change. Teal dashed geometry shows the preview; B stays blue until you apply.`);
    }
    function attempt(fn) { try { fn(); } catch(e) { say(e.message,true); } }
    $('selectPoint').onclick=()=>attempt(()=>choose(Number($('editPoint').value)));
    $('editPoint').onkeydown=e=>{if(e.key==='Enter')attempt(()=>choose(Number($('editPoint').value)));};
    $('useCurrent').onclick=()=>attempt(()=>choose(api.currentB()));
    $('pinStart').onclick=()=>{ $('rangeStart').value=selected; cancel(); say(`Start pinned at point ${selected}.`); };
    $('pinEnd').onclick=()=>{ $('rangeEnd').value=selected; cancel(); say(`End pinned at point ${selected}.`); };
    for(const id of ['rangeStart','rangeEnd']) $(id).oninput=()=>cancel();
    $('previewPoint').onclick=()=>attempt(()=>{
      const values={}; for(const a of axes()) {if($('value_'+a).value.trim()==='')throw new Error('Enter a value for '+a.toUpperCase()); values[a]=Number($('value_'+a).value);}
      preview(CncEdit.editPoint(program().pts,selected,values),`Edit point ${selected}`);
    });
    $('previewStraight').onclick=()=>attempt(()=>preview(CncEdit.straighten(program().pts,Number($('rangeStart').value),Number($('rangeEnd').value),axes()),'Straighten selected axes'));
    $('applyEdit').onclick=()=>{if(!pending)return; undo.push(clone(program().pts)); redo=[]; const next=pending; pending=null; api.setPoints(next.pts); refresh(); api.draw(); api.readouts(); say(next.description+' applied to draft. Original source is unchanged.');};
    $('cancelEdit').onclick=()=>{cancel();say('Preview cancelled.');};
    function history(from,to,label){if(!from.length)return; pending=null;to.push(clone(program().pts));api.setPoints(from.pop());refresh();api.draw();api.readouts();say(label);}
    $('editUndo').onclick=()=>history(undo,redo,'Undid last draft edit.'); $('editRedo').onclick=()=>history(redo,undo,'Redid draft edit.');
    $('copyToB').onclick=()=>{ if(program().name&&!window.confirm('Replace the current B working copy and its draft edits with a copy of A?'))return; api.copyA();reset();api.draw();say('A copied to B. A remains your unchanged reference.'); };
    function plan() {
      if(pending)throw new Error('Apply or cancel the preview before preparing an edit plan.');
      const b=program(),start=Number($('rangeStart').value),end=Number($('rangeEnd').value);
      if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>=b.pts.length||start>end)throw new Error('Choose a valid start/end range for the request.');
      return {format:'cnc-draft-edit-plan-v1',purpose:'Review instructions only; not executable CNC code',file:b.name,units:b.unitLabel,selectedPoint:selected,range:{start,end},editableAxes:axes().map(a=>a.toUpperCase()),instruction:$('editIntent').value.trim(),sourceLines:b.pts.slice(start,end+1).map((p,j)=>({point:start+j,line:p.line,block:p.block,original:p.raw,coordinates:Object.fromEntries(CncEdit.AXES.filter(a=>['x','y','z','b','c'].includes(a)||b.axesUsed.has(a.toUpperCase())).map(a=>[a.toUpperCase(),p[a]]))})),draftChanges:CncEdit.changes(base,b.pts)};
    }
    $('makeRequest').onclick=()=>attempt(()=>{const data=plan();$('requestText').value='Please review this Thermwood CNC edit request. Keep all unselected axes and unrelated source lines unchanged. Point numbers refer to numeric endpoints in this viewer, not a full machine simulation. Validate against the complete original program before producing runnable G-code.\n\n'+JSON.stringify(data,null,2);$('copyRequest').disabled=false;say('Request prepared. Review it below, then copy it into ChatGPT.');});
    $('copyRequest').onclick=async()=>{try{await navigator.clipboard.writeText($('requestText').value);say('Request copied.');}catch{$('requestText').focus();$('requestText').select();say('Select and copy the request text below.');}};
    $('downloadPlan').onclick=()=>attempt(()=>{const data=plan(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(data.file||'program')+'.edit-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Downloaded the draft edit plan (not executable G-code).');});
    function overlay(ctx,b,W,H){
      if(!api.showB())return;
      const pts=program().pts; ctx.save();
      if(pending){ctx.strokeStyle='#0f766e';ctx.lineWidth=2;ctx.setLineDash([7,4]);ctx.beginPath();for(let i=1;i<pending.pts.length;i++){if(pending.pts[i].type==='rapid'&&!api.showRapid())continue;ctx.moveTo(...api.project(pending.pts[i-1],b,W,H));ctx.lineTo(...api.project(pending.pts[i],b,W,H));}ctx.stroke();ctx.setLineDash([]);for(const change of CncEdit.changes(pts,pending.pts)){const q=api.project(pending.pts[change.point],b,W,H);ctx.beginPath();ctx.arc(...q,5,0,Math.PI*2);ctx.fillStyle='#0f766e';ctx.fill();}}
      if(pts[selected]){const q=api.project(pts[selected],b,W,H);ctx.strokeStyle='#0f766e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(...q,16,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#0f766e';ctx.font='bold 12px system-ui';ctx.fillText('Edit B '+selected,q[0]+20,q[1]+42);}
      ctx.restore();
    }
    reset(); return {reset,refresh,overlay,select:i=>attempt(()=>choose(i)),hasChanges:()=>!!pending||undo.length>0};
  };
})();
